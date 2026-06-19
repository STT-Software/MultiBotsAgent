import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { IntegrationProvider } from "@multibotagents/types";
import { IntegrationsController } from "../integrations.controller";
import type { IntegrationsService } from "../integrations.service";

describe("IntegrationsController", () => {
  let controller: IntegrationsController;
  let service: {
    buildAuthorizationUrl: ReturnType<typeof vi.fn>;
    handleCallback: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.stubEnv("FRONTEND_URL", "https://panel.test");

    service = {
      buildAuthorizationUrl: vi
        .fn()
        .mockResolvedValue({ authorizationUrl: "https://provider/auth" }),
      handleCallback: vi.fn(),
    };

    controller = new IntegrationsController(
      service as unknown as IntegrationsService,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("authorize", () => {
    it("usa el companyId del token y delega en el servicio", async () => {
      const req = { user: { companyId: "company-123" } } as unknown as Request;

      const result = await controller.authorize(req, {
        provider: IntegrationProvider.GOOGLE_DRIVE,
      });

      expect(result).toEqual({ authorizationUrl: "https://provider/auth" });
      expect(service.buildAuthorizationUrl).toHaveBeenCalledWith(
        "company-123",
        IntegrationProvider.GOOGLE_DRIVE,
        undefined,
      );
    });
  });

  describe("callback", () => {
    it("redirige al panel con el status devuelto por el servicio", async () => {
      service.handleCallback.mockResolvedValue("success");
      const redirect = vi.fn();
      const res = { redirect } as unknown as Response;

      await controller.callback(
        { code: "auth-code", state: "signed-state" },
        res,
      );

      expect(service.handleCallback).toHaveBeenCalledWith({
        code: "auth-code",
        state: "signed-state",
      });
      expect(redirect).toHaveBeenCalledWith(
        "https://panel.test/integraciones?status=success",
      );
    });

    it("propaga el resultado de error en la redirección", async () => {
      service.handleCallback.mockResolvedValue("state_expired");
      const redirect = vi.fn();
      const res = { redirect } as unknown as Response;

      await controller.callback({ state: "bad-state" }, res);

      expect(redirect).toHaveBeenCalledWith(
        "https://panel.test/integraciones?status=state_expired",
      );
    });
  });
});
