import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { IntegrationProvider } from "@multibotagents/types";
import { OAuthStateService } from "../oauth-state.service";
import { InvalidOAuthStateError } from "../errors";
import type {
  IOAuthStateStore,
  OAuthStateConsumeResult,
} from "../ports/oauth-state-store.interface";

const SECRET = "test-oauth-state-secret";

const CONTEXT = {
  companyId: "company-123",
  provider: IntegrationProvider.GOOGLE_DRIVE,
  agentId: "agent-456",
};

describe("OAuthStateService", () => {
  let store: IOAuthStateStore;
  let service: OAuthStateService;

  beforeEach(() => {
    store = {
      persist: vi.fn().mockResolvedValue(undefined),
      consume: vi.fn(),
    };
    service = new OAuthStateService({ config: { secret: SECRET }, store });
  });

  describe("constructor", () => {
    it("lanza si no se provee secret", () => {
      expect(
        () => new OAuthStateService({ config: { secret: "" }, store }),
      ).toThrow();
    });
  });

  describe("issue", () => {
    it("firma un JWT con el contexto y lo persiste con TTL", async () => {
      const token = await service.issue(CONTEXT);

      // El JWT es verificable con el secreto y transporta el contexto.
      const claims = jwt.verify(token, SECRET) as Record<string, unknown>;
      expect(claims.companyId).toBe(CONTEXT.companyId);
      expect(claims.provider).toBe(CONTEXT.provider);
      expect(claims.agentId).toBe(CONTEXT.agentId);
      expect(claims.jti).toEqual(expect.any(String));
      // TTL por defecto de 10 minutos (600 s).
      expect((claims.exp as number) - (claims.iat as number)).toBe(600);

      // Se persiste el state con el mismo jti y una expiración futura.
      expect(store.persist).toHaveBeenCalledWith(
        expect.objectContaining({
          jti: claims.jti,
          companyId: CONTEXT.companyId,
          provider: CONTEXT.provider,
          agentId: CONTEXT.agentId,
          expiresAt: expect.any(Date),
        }),
      );
    });

    it("omite agentId cuando no se provee", async () => {
      const token = await service.issue({
        companyId: CONTEXT.companyId,
        provider: CONTEXT.provider,
      });

      const claims = jwt.verify(token, SECRET) as Record<string, unknown>;
      expect(claims.agentId).toBeUndefined();
    });
  });

  describe("validateAndConsume", () => {
    it("devuelve el contexto y consume el state cuando es válido", async () => {
      const consumeResult: OAuthStateConsumeResult = {
        jti: "jti-1",
        companyId: CONTEXT.companyId,
        provider: CONTEXT.provider,
        agentId: CONTEXT.agentId,
      };
      vi.mocked(store.consume).mockResolvedValue(consumeResult);

      const token = await service.issue(CONTEXT);
      const result = await service.validateAndConsume(token);

      expect(result).toEqual(consumeResult);
      expect(store.consume).toHaveBeenCalledOnce();
    });

    it("lanza InvalidOAuthStateError si la firma es inválida", async () => {
      const tokenOtroSecreto = jwt.sign(
        { companyId: CONTEXT.companyId, provider: CONTEXT.provider },
        "otro-secreto",
        { algorithm: "HS256", expiresIn: 600, jwtid: "jti-x" },
      );

      await expect(
        service.validateAndConsume(tokenOtroSecreto),
      ).rejects.toBeInstanceOf(InvalidOAuthStateError);
      expect(store.consume).not.toHaveBeenCalled();
    });

    it("lanza InvalidOAuthStateError si el state expiró (TTL vencido)", async () => {
      const tokenExpirado = jwt.sign(
        { companyId: CONTEXT.companyId, provider: CONTEXT.provider },
        SECRET,
        { algorithm: "HS256", expiresIn: -10, jwtid: "jti-exp" },
      );

      await expect(
        service.validateAndConsume(tokenExpirado),
      ).rejects.toBeInstanceOf(InvalidOAuthStateError);
      expect(store.consume).not.toHaveBeenCalled();
    });

    it("lanza InvalidOAuthStateError si el state ya fue usado (anti-replay)", async () => {
      vi.mocked(store.consume).mockResolvedValue(null);

      const token = await service.issue(CONTEXT);

      await expect(service.validateAndConsume(token)).rejects.toBeInstanceOf(
        InvalidOAuthStateError,
      );
      expect(store.consume).toHaveBeenCalledOnce();
    });
  });
});
