import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BadRequestException } from "@nestjs/common";
import {
  IntegrationProvider,
  IntegrationStatus,
} from "@multibotagents/types";
import type { OAuthStateService } from "@multibotagents/core";
import type { IIntegrationRepository } from "@multibotagents/db";
import { IntegrationsService } from "../integrations.service";
import type { GoogleDriveAdapter } from "../providers";

/** Clave de cifrado de prueba (32 bytes en hex). */
const ENCRYPTION_KEY = "a".repeat(64);
const REDIRECT_URI = "https://app.test/integrations/oauth/callback";

/** Scopes que el proveedor concede en el camino feliz (incluye el funcional). */
const GRANTED_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

const CONTEXT = {
  jti: "jti-1",
  companyId: "company-123",
  provider: IntegrationProvider.GOOGLE_DRIVE,
};

describe("IntegrationsService", () => {
  let repo: { upsertByCompanyAndProvider: ReturnType<typeof vi.fn> };
  let oauthStateService: {
    issue: ReturnType<typeof vi.fn>;
    validateAndConsume: ReturnType<typeof vi.fn>;
  };
  let adapter: {
    exchangeCodeForTokens: ReturnType<typeof vi.fn>;
    fetchAccountMetadata: ReturnType<typeof vi.fn>;
  };
  let service: IntegrationsService;

  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
    vi.stubEnv("INTEGRATIONS_OAUTH_REDIRECT_URI", REDIRECT_URI);
    vi.stubEnv("ENCRYPTION_KEY", ENCRYPTION_KEY);

    repo = { upsertByCompanyAndProvider: vi.fn().mockResolvedValue(undefined) };
    oauthStateService = {
      issue: vi.fn().mockResolvedValue("signed-state"),
      validateAndConsume: vi.fn().mockResolvedValue(CONTEXT),
    };
    adapter = {
      exchangeCodeForTokens: vi.fn().mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date("2030-01-01T00:00:00Z"),
        scopes: GRANTED_SCOPES,
      }),
      fetchAccountMetadata: vi.fn().mockResolvedValue({
        accountDisplayName: "user@empresa.com",
        providerAccountId: "google-user-1",
      }),
    };

    service = new IntegrationsService(
      repo as unknown as IIntegrationRepository,
      oauthStateService as unknown as OAuthStateService,
      adapter as unknown as GoogleDriveAdapter,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("buildAuthorizationUrl", () => {
    it("emite el state y construye la URL de autorización del proveedor", async () => {
      const { authorizationUrl } = await service.buildAuthorizationUrl(
        CONTEXT.companyId,
        IntegrationProvider.GOOGLE_DRIVE,
      );

      expect(oauthStateService.issue).toHaveBeenCalledWith({
        companyId: CONTEXT.companyId,
        provider: IntegrationProvider.GOOGLE_DRIVE,
        agentId: undefined,
      });

      const url = new URL(authorizationUrl);
      expect(url.origin + url.pathname).toBe(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      expect(url.searchParams.get("client_id")).toBe("google-client-id");
      expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT_URI);
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("state")).toBe("signed-state");
      expect(url.searchParams.get("access_type")).toBe("offline");
      expect(url.searchParams.get("prompt")).toBe("consent");
      expect(url.searchParams.get("scope")).toContain("drive.readonly");
    });

    it("rechaza un proveedor no soportado sin emitir state", async () => {
      await expect(
        service.buildAuthorizationUrl(CONTEXT.companyId, IntegrationProvider.NOTION),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(oauthStateService.issue).not.toHaveBeenCalled();
    });
  });

  describe("handleCallback", () => {
    it("persiste la integración y retorna 'success' en el camino feliz", async () => {
      const result = await service.handleCallback({
        code: "auth-code",
        state: "signed-state",
      });

      expect(result).toBe("success");
      expect(adapter.exchangeCodeForTokens).toHaveBeenCalledWith(
        "auth-code",
        REDIRECT_URI,
      );
      expect(repo.upsertByCompanyAndProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: CONTEXT.companyId,
          provider: IntegrationProvider.GOOGLE_DRIVE,
          status: IntegrationStatus.CONNECTED,
          accountDisplayName: "user@empresa.com",
          providerAccountId: "google-user-1",
          // Los tokens se almacenan cifrados, nunca en claro.
          encryptedAccessToken: expect.objectContaining({
            ciphertext: expect.any(String),
            iv: expect.any(String),
            tag: expect.any(String),
          }),
          encryptedRefreshToken: expect.objectContaining({
            ciphertext: expect.any(String),
          }),
        }),
      );
    });

    it("marca 'insufficient_scopes' cuando falta un scope funcional", async () => {
      adapter.exchangeCodeForTokens.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        // Falta el scope funcional drive.readonly (solo se concedió el de identidad).
        scopes: ["https://www.googleapis.com/auth/userinfo.email"],
      });

      const result = await service.handleCallback({
        code: "auth-code",
        state: "signed-state",
      });

      expect(result).toBe("insufficient_scopes");
      expect(repo.upsertByCompanyAndProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          status: IntegrationStatus.INSUFFICIENT_SCOPES,
        }),
      );
    });

    it("retorna 'access_denied' y no persiste si el usuario cancela", async () => {
      const result = await service.handleCallback({
        error: "access_denied",
        state: "signed-state",
      });

      expect(result).toBe("access_denied");
      expect(oauthStateService.validateAndConsume).not.toHaveBeenCalled();
      expect(repo.upsertByCompanyAndProvider).not.toHaveBeenCalled();
    });

    it("retorna 'exchange_failed' ante otro error del proveedor", async () => {
      const result = await service.handleCallback({
        error: "server_error",
        state: "signed-state",
      });

      expect(result).toBe("exchange_failed");
      expect(repo.upsertByCompanyAndProvider).not.toHaveBeenCalled();
    });

    it("retorna 'state_expired' y no persiste si el state es inválido/expiró", async () => {
      oauthStateService.validateAndConsume.mockRejectedValue(new Error("invalid"));

      const result = await service.handleCallback({
        code: "auth-code",
        state: "bad-state",
      });

      expect(result).toBe("state_expired");
      expect(adapter.exchangeCodeForTokens).not.toHaveBeenCalled();
      expect(repo.upsertByCompanyAndProvider).not.toHaveBeenCalled();
    });

    it("retorna 'exchange_failed' si llega sin code tras validar el state", async () => {
      const result = await service.handleCallback({ state: "signed-state" });

      expect(result).toBe("exchange_failed");
      expect(adapter.exchangeCodeForTokens).not.toHaveBeenCalled();
      expect(repo.upsertByCompanyAndProvider).not.toHaveBeenCalled();
    });

    it("retorna 'exchange_failed' y no persiste si el intercambio de code falla", async () => {
      adapter.exchangeCodeForTokens.mockRejectedValue(
        new BadRequestException("code inválido"),
      );

      const result = await service.handleCallback({
        code: "auth-code",
        state: "signed-state",
      });

      expect(result).toBe("exchange_failed");
      expect(repo.upsertByCompanyAndProvider).not.toHaveBeenCalled();
    });
  });
});
