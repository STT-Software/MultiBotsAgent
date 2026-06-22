import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  IntegrationCategory,
  IntegrationProvider,
  IntegrationStatus,
} from "@multibotagents/types";
import type { Integration } from "@multibotagents/types";
import { encryptToken } from "@multibotagents/core";
import type { OAuthStateService } from "@multibotagents/core";
import type { IIntegrationRepository } from "@multibotagents/db";
import { IntegrationsService } from "../integrations.service";
import {
  IntegrationNotFoundException,
  IntegrationNotConnectedException,
} from "../exceptions/integrations.exceptions";
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

/** Construye una `Integration` de prueba con tokens cifrados reales. */
function makeIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    id: "int-1",
    companyId: CONTEXT.companyId,
    provider: IntegrationProvider.GOOGLE_DRIVE,
    category: IntegrationCategory.DOCUMENT_SOURCE,
    status: IntegrationStatus.CONNECTED,
    encryptedAccessToken: encryptToken("access-token", ENCRYPTION_KEY),
    encryptedRefreshToken: encryptToken("refresh-token", ENCRYPTION_KEY),
    tokenExpiresAt: new Date("2030-01-01T00:00:00Z"),
    scopes: GRANTED_SCOPES,
    accountDisplayName: "user@empresa.com",
    providerAccountId: "google-user-1",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("IntegrationsService", () => {
  let repo: {
    upsertByCompanyAndProvider: ReturnType<typeof vi.fn>;
    findByCompanyId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByCompanyAndProvider: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let oauthStateService: {
    issue: ReturnType<typeof vi.fn>;
    validateAndConsume: ReturnType<typeof vi.fn>;
  };
  let adapter: {
    exchangeCodeForTokens: ReturnType<typeof vi.fn>;
    fetchAccountMetadata: ReturnType<typeof vi.fn>;
    revokeAccess: ReturnType<typeof vi.fn>;
  };
  let service: IntegrationsService;

  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
    vi.stubEnv("INTEGRATIONS_OAUTH_REDIRECT_URI", REDIRECT_URI);
    vi.stubEnv("ENCRYPTION_KEY", ENCRYPTION_KEY);

    repo = {
      upsertByCompanyAndProvider: vi.fn().mockResolvedValue(undefined),
      findByCompanyId: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      findByCompanyAndProvider: vi.fn().mockResolvedValue(null),
      disconnect: vi.fn(),
    };
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
      revokeAccess: vi.fn().mockResolvedValue(undefined),
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

  describe("listIntegrations", () => {
    it("devuelve IntegrationSummary[] sin tokens ni campos sensibles (R7.4)", async () => {
      repo.findByCompanyId.mockResolvedValue([
        makeIntegration(),
        makeIntegration({
          id: "int-2",
          status: IntegrationStatus.DISCONNECTED,
          encryptedAccessToken: undefined,
          encryptedRefreshToken: undefined,
          tokenExpiresAt: undefined,
        }),
      ]);

      const result = await service.listIntegrations(CONTEXT.companyId);

      expect(repo.findByCompanyId).toHaveBeenCalledWith(CONTEXT.companyId);
      expect(result).toHaveLength(2);
      for (const summary of result) {
        expect(summary).not.toHaveProperty("encryptedAccessToken");
        expect(summary).not.toHaveProperty("encryptedRefreshToken");
        expect(summary).not.toHaveProperty("tokenExpiresAt");
        expect(summary).not.toHaveProperty("companyId");
      }
      expect(result[0]).toMatchObject({
        id: "int-1",
        provider: IntegrationProvider.GOOGLE_DRIVE,
        status: IntegrationStatus.CONNECTED,
        accountDisplayName: "user@empresa.com",
      });
    });
  });

  describe("disconnect", () => {
    it("revoca el token, limpia la BD y devuelve el resumen desconectado (R6)", async () => {
      repo.findById.mockResolvedValue(makeIntegration());
      repo.disconnect.mockResolvedValue(
        makeIntegration({
          status: IntegrationStatus.DISCONNECTED,
          encryptedAccessToken: undefined,
          encryptedRefreshToken: undefined,
          tokenExpiresAt: undefined,
        }),
      );

      const summary = await service.disconnect(CONTEXT.companyId, "int-1");

      // Revoca con el refresh token descifrado y limpia vía repo.disconnect.
      expect(adapter.revokeAccess).toHaveBeenCalledWith("refresh-token");
      expect(repo.disconnect).toHaveBeenCalledWith("int-1");
      expect(summary.status).toBe(IntegrationStatus.DISCONNECTED);
      expect(summary).not.toHaveProperty("encryptedAccessToken");
    });

    it("continúa con la limpieza aunque la revocación en el proveedor falle (R6.3)", async () => {
      repo.findById.mockResolvedValue(makeIntegration());
      adapter.revokeAccess.mockRejectedValue(new Error("revoke failed"));
      repo.disconnect.mockResolvedValue(
        makeIntegration({ status: IntegrationStatus.DISCONNECTED }),
      );

      const summary = await service.disconnect(CONTEXT.companyId, "int-1");

      expect(repo.disconnect).toHaveBeenCalledWith("int-1");
      expect(summary.status).toBe(IntegrationStatus.DISCONNECTED);
    });

    it("lanza NotFound y no toca la BD si la integración es de otra empresa", async () => {
      repo.findById.mockResolvedValue(
        makeIntegration({ companyId: "otra-empresa" }),
      );

      await expect(
        service.disconnect(CONTEXT.companyId, "int-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.disconnect).not.toHaveBeenCalled();
      expect(adapter.revokeAccess).not.toHaveBeenCalled();
    });

    it("lanza NotFound si la integración no existe", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.disconnect(CONTEXT.companyId, "missing"),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.disconnect).not.toHaveBeenCalled();
    });
  });

  describe("getConnectedIntegration", () => {
    it("devuelve la integración cuando está connected", async () => {
      const integration = makeIntegration();
      repo.findByCompanyAndProvider.mockResolvedValue(integration);

      await expect(
        service.getConnectedIntegration(
          CONTEXT.companyId,
          IntegrationProvider.GOOGLE_DRIVE,
        ),
      ).resolves.toBe(integration);
    });

    it("lanza IntegrationNotFound si la empresa no tiene esa integración (R6.4)", async () => {
      repo.findByCompanyAndProvider.mockResolvedValue(null);

      await expect(
        service.getConnectedIntegration(
          CONTEXT.companyId,
          IntegrationProvider.GOOGLE_DRIVE,
        ),
      ).rejects.toBeInstanceOf(IntegrationNotFoundException);
    });

    it("lanza IntegrationNotConnected con el status si está desconectada (R6.4)", async () => {
      repo.findByCompanyAndProvider.mockResolvedValue(
        makeIntegration({ status: IntegrationStatus.DISCONNECTED }),
      );

      const error = await service
        .getConnectedIntegration(
          CONTEXT.companyId,
          IntegrationProvider.GOOGLE_DRIVE,
        )
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(IntegrationNotConnectedException);
      expect(error).toMatchObject({
        code: "INTEGRATION_NOT_CONNECTED",
        status: IntegrationStatus.DISCONNECTED,
      });
    });
  });
});
