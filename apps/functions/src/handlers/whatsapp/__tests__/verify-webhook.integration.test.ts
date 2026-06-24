import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { handler } from "../verify-webhook.handler";

/**
 * Integration tests for the verify-webhook Lambda handler.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.2, 5.2, 5.4, 7.3
 */

vi.mock("../../../shared/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createApiGatewayEvent(
  queryParams?: Record<string, string>
): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "GET /webhooks/whatsapp",
    rawPath: "/webhooks/whatsapp",
    rawQueryString: queryParams
      ? Object.entries(queryParams)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join("&")
      : "",
    queryStringParameters: queryParams,
    headers: {},
    isBase64Encoded: false,
    requestContext: {
      accountId: "123456789012",
      apiId: "api-id",
      domainName: "api-id.execute-api.us-east-1.amazonaws.com",
      domainPrefix: "api-id",
      http: {
        method: "GET",
        path: "/webhooks/whatsapp",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "facebookexternalua",
      },
      requestId: "request-id",
      routeKey: "GET /webhooks/whatsapp",
      stage: "$default",
      time: "01/Jan/2024:00:00:00 +0000",
      timeEpoch: 1704067200000,
    },
  } as APIGatewayProxyEventV2;
}

const TEST_TOKEN = "my_secret_verify_token_12345";
const TEST_CHALLENGE = "challenge_abc_987";

/** Helper to invoke handler and cast to structured result (handler never returns a plain string). */
async function invokeHandler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const result = await handler(event);
  return result as APIGatewayProxyStructuredResultV2;
}

describe("verify-webhook handler — Integration Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, WHATSAPP_VERIFY_TOKEN: TEST_TOKEN };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Happy path: verificación exitosa", () => {
    it("retorna 200 con el challenge cuando todos los params son correctos", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": TEST_TOKEN,
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result).toEqual({
        statusCode: 200,
        headers: { "Content-Type": "text/plain" },
        body: TEST_CHALLENGE,
      });
    });

    it("retorna Content-Type text/plain en respuesta exitosa", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": TEST_TOKEN,
        "hub.challenge": "any_challenge_value",
      });

      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.["Content-Type"]).toBe("text/plain");
    });

    it("retorna el challenge sin modificaciones (sin JSON wrapping)", async () => {
      const challengeWithSpecialChars = "1234567890_special-chars!@#";
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": TEST_TOKEN,
        "hub.challenge": challengeWithSpecialChars,
      });

      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe(challengeWithSpecialChars);
    });
  });

  describe("Rechazo: hub.mode ausente", () => {
    it("retorna 403 con Content-Type application/json", async () => {
      const event = createApiGatewayEvent({
        "hub.verify_token": TEST_TOKEN,
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(403);
      expect(result.headers?.["Content-Type"]).toBe("application/json");
    });
  });

  describe("Rechazo: hub.verify_token ausente", () => {
    it("retorna 403 con Content-Type application/json", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(403);
      expect(result.headers?.["Content-Type"]).toBe("application/json");
    });
  });

  describe("Rechazo: hub.challenge ausente", () => {
    it("retorna 403 con Content-Type application/json", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": TEST_TOKEN,
      });

      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(403);
      expect(result.headers?.["Content-Type"]).toBe("application/json");
    });
  });

  describe("Rechazo: token mismatch", () => {
    it("retorna 403 con Content-Type application/json cuando el token no coincide", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong_token_value",
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(403);
      expect(result.headers?.["Content-Type"]).toBe("application/json");
    });
  });

  describe("Error: WHATSAPP_VERIFY_TOKEN no configurado", () => {
    it("retorna 500 con Content-Type application/json cuando env var está ausente", async () => {
      delete process.env.WHATSAPP_VERIFY_TOKEN;

      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": "any_token",
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(500);
      expect(result.headers?.["Content-Type"]).toBe("application/json");
    });

    it("retorna 500 cuando env var es string vacío", async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "";

      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": "any_token",
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(500);
    });
  });

  describe("Formato de respuesta: body de errores es JSON válido con campo 'error'", () => {
    it("body de 403 es JSON válido con campo error", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong_token",
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);
      const body = JSON.parse(result.body!);

      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });

    it("body de 500 es JSON válido con campo error", async () => {
      delete process.env.WHATSAPP_VERIFY_TOKEN;

      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": "any_token",
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);
      const body = JSON.parse(result.body!);

      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });
  });

  describe("Seguridad: no se expone el token en respuestas", () => {
    it("el token configurado no aparece en el body de respuesta exitosa", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": TEST_TOKEN,
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result.body).not.toContain(TEST_TOKEN);
    });

    it("el token configurado no aparece en el body de respuesta de error 403", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong_token",
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result.body).not.toContain(TEST_TOKEN);
    });

    it("el token configurado no aparece en el body de respuesta de error 500", async () => {
      delete process.env.WHATSAPP_VERIFY_TOKEN;
      const tokenValue = "secret_token_that_should_not_leak";
      // Even if somehow the token was set and then cleared, ensure no leakage
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": tokenValue,
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result.body).not.toContain(tokenValue);
    });
  });

  describe("Formato de respuesta compatible con API Gateway v2", () => {
    it("respuesta exitosa tiene statusCode, headers y body", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": TEST_TOKEN,
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result).toHaveProperty("statusCode");
      expect(result).toHaveProperty("headers");
      expect(result).toHaveProperty("body");
      expect(typeof result.statusCode).toBe("number");
      expect(typeof result.body).toBe("string");
    });

    it("respuesta de error tiene statusCode, headers y body", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "invalid",
        "hub.verify_token": TEST_TOKEN,
        "hub.challenge": TEST_CHALLENGE,
      });

      const result = await invokeHandler(event);

      expect(result).toHaveProperty("statusCode");
      expect(result).toHaveProperty("headers");
      expect(result).toHaveProperty("body");
      expect(typeof result.statusCode).toBe("number");
      expect(typeof result.body).toBe("string");
    });
  });

  describe("Extracción correcta de query params del evento API Gateway v2", () => {
    it("extrae hub.mode, hub.verify_token y hub.challenge de queryStringParameters", async () => {
      const event = createApiGatewayEvent({
        "hub.mode": "subscribe",
        "hub.verify_token": TEST_TOKEN,
        "hub.challenge": "extracted_challenge_value",
      });

      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe("extracted_challenge_value");
    });

    it("maneja queryStringParameters undefined sin crash", async () => {
      const event = createApiGatewayEvent(undefined);

      const result = await invokeHandler(event);

      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      expect(result).toHaveProperty("headers");
      expect(result).toHaveProperty("body");
    });
  });
});
