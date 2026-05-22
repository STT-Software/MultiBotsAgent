import { describe, it, expect } from "vitest";
import { verifyWebhook } from "../verify-webhook.service";

describe("verifyWebhook", () => {
  describe("Happy path", () => {
    it("returns 200 with challenge when mode=subscribe, tokens match, and challenge present", () => {
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: "my_secret_token_123",
        challenge: "1158201444",
        configuredToken: "my_secret_token_123",
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        body: "1158201444",
      });
    });
  });

  describe("Challenge with special characters", () => {
    it("returns 200 with unicode challenge (emojis, accented chars)", () => {
      const challenge = "🚀 verificación éxito ñ ü ö 你好";
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: "token_abc",
        challenge,
        configuredToken: "token_abc",
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        body: challenge,
      });
    });

    it("returns 200 with challenge containing spaces and long numbers", () => {
      const challenge = "  99999999999999999999  spaces  ";
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: "tok",
        challenge,
        configuredToken: "tok",
      });

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        body: challenge,
      });
    });
  });

  describe("Token empty vs undefined (configuredToken)", () => {
    it("returns 500 when configuredToken is empty string", () => {
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: "any_token",
        challenge: "challenge_value",
        configuredToken: "",
      });

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        body: "",
      });
    });

    it("returns 500 when configuredToken is undefined", () => {
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: "any_token",
        challenge: "challenge_value",
        configuredToken: undefined,
      });

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        body: "",
      });
    });
  });

  describe("Mode case sensitivity", () => {
    it('returns 403 when mode is "Subscribe" (capital S)', () => {
      const result = verifyWebhook({
        mode: "Subscribe",
        verifyToken: "valid_token",
        challenge: "challenge_123",
        configuredToken: "valid_token",
      });

      expect(result).toEqual({
        success: false,
        statusCode: 403,
        body: "",
      });
    });

    it('returns 403 when mode is "SUBSCRIBE" (all caps)', () => {
      const result = verifyWebhook({
        mode: "SUBSCRIBE",
        verifyToken: "valid_token",
        challenge: "challenge_123",
        configuredToken: "valid_token",
      });

      expect(result).toEqual({
        success: false,
        statusCode: 403,
        body: "",
      });
    });

    it("returns 403 when mode is undefined", () => {
      const result = verifyWebhook({
        mode: undefined,
        verifyToken: "valid_token",
        challenge: "challenge_123",
        configuredToken: "valid_token",
      });

      expect(result).toEqual({
        success: false,
        statusCode: 403,
        body: "",
      });
    });
  });

  describe("Missing parameters", () => {
    it("returns 403 when verifyToken is undefined", () => {
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: undefined,
        challenge: "challenge_123",
        configuredToken: "valid_token",
      });

      expect(result).toEqual({
        success: false,
        statusCode: 403,
        body: "",
      });
    });

    it("returns 403 when challenge is undefined", () => {
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: "valid_token",
        challenge: undefined,
        configuredToken: "valid_token",
      });

      expect(result).toEqual({
        success: false,
        statusCode: 403,
        body: "",
      });
    });

    it("returns 500 when all params are undefined (configuredToken checked first)", () => {
      const result = verifyWebhook({
        mode: undefined,
        verifyToken: undefined,
        challenge: undefined,
        configuredToken: undefined,
      });

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        body: "",
      });
    });
  });

  describe("Token mismatch", () => {
    it("returns 403 when verifyToken does not match configuredToken", () => {
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: "wrong_token",
        challenge: "challenge_123",
        configuredToken: "correct_token",
      });

      expect(result).toEqual({
        success: false,
        statusCode: 403,
        body: "",
      });
    });
  });

  describe("Security: no token exposure", () => {
    it("does not expose configuredToken in error response body (token mismatch)", () => {
      const configuredToken = "super_secret_configured_token_xyz";
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: "attacker_token",
        challenge: "challenge_value",
        configuredToken,
      });

      expect(result.body).not.toContain(configuredToken);
    });

    it("does not expose configuredToken in error response body (mode invalid)", () => {
      const configuredToken = "my_configured_secret";
      const result = verifyWebhook({
        mode: "invalid_mode",
        verifyToken: "some_token",
        challenge: "challenge_value",
        configuredToken,
      });

      expect(result.body).not.toContain(configuredToken);
    });

    it("does not expose configuredToken in 500 response body", () => {
      const result = verifyWebhook({
        mode: "subscribe",
        verifyToken: "token",
        challenge: "challenge",
        configuredToken: "",
      });

      expect(result.body).not.toContain("configuredToken");
      expect(result.body).not.toContain("WHATSAPP_VERIFY_TOKEN");
    });
  });
});
