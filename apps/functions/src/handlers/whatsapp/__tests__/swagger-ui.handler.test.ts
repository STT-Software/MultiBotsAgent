import { describe, it, expect } from "vitest";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { handler } from "../swagger-ui.handler";

/**
 * Tests for the swagger-ui Lambda handler.
 * Validates: Requirement 8.4 — Swagger UI accesible sin autenticación.
 */

function createEvent(path: string, stage = "$default"): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: `GET ${path}`,
    rawPath: path,
    rawQueryString: "",
    headers: {},
    isBase64Encoded: false,
    requestContext: {
      accountId: "123456789012",
      apiId: "api-id",
      domainName: "api-id.execute-api.us-east-1.amazonaws.com",
      domainPrefix: "api-id",
      http: {
        method: "GET",
        path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      },
      requestId: "request-id",
      routeKey: `GET ${path}`,
      stage,
      time: "01/Jan/2024:00:00:00 +0000",
      timeEpoch: 1704067200000,
    },
  } as APIGatewayProxyEventV2;
}

async function invokeHandler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const result = await handler(event);
  return result as APIGatewayProxyStructuredResultV2;
}

describe("swagger-ui handler", () => {
  describe("GET /webhooks/docs — Swagger UI HTML", () => {
    it("retorna 200 con Content-Type text/html", async () => {
      const event = createEvent("/webhooks/docs");
      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.["Content-Type"]).toBe(
        "text/html; charset=utf-8"
      );
    });

    it("retorna HTML con Swagger UI cargado desde CDN", async () => {
      const event = createEvent("/webhooks/docs");
      const result = await invokeHandler(event);

      expect(result.body).toContain("swagger-ui");
      expect(result.body).toContain("unpkg.com/swagger-ui-dist");
      expect(result.body).toContain("SwaggerUIBundle");
    });

    it("apunta al spec URL correcto para stage $default", async () => {
      const event = createEvent("/webhooks/docs", "$default");
      const result = await invokeHandler(event);

      expect(result.body).toContain("/webhooks/docs/spec");
    });

    it("incluye título descriptivo en el HTML", async () => {
      const event = createEvent("/webhooks/docs");
      const result = await invokeHandler(event);

      expect(result.body).toContain(
        "MultiBotsAgent - WhatsApp Webhooks API"
      );
    });
  });

  describe("GET /webhooks/docs/spec — OpenAPI YAML", () => {
    it("retorna 200 con Content-Type application/yaml", async () => {
      const event = createEvent("/webhooks/docs/spec");
      const result = await invokeHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.["Content-Type"]).toBe("application/yaml");
    });

    it("retorna especificación OpenAPI válida", async () => {
      const event = createEvent("/webhooks/docs/spec");
      const result = await invokeHandler(event);

      expect(result.body).toContain("openapi: 3.0.3");
      expect(result.body).toContain("/webhooks/whatsapp");
      expect(result.body).toContain("hub.mode");
      expect(result.body).toContain("hub.verify_token");
      expect(result.body).toContain("hub.challenge");
    });

    it("incluye CORS header para permitir carga desde Swagger UI", async () => {
      const event = createEvent("/webhooks/docs/spec");
      const result = await invokeHandler(event);

      expect(result.headers?.["Access-Control-Allow-Origin"]).toBe("*");
    });

    it("documenta los códigos de respuesta 200, 400, 403, 500", async () => {
      const event = createEvent("/webhooks/docs/spec");
      const result = await invokeHandler(event);

      expect(result.body).toContain('"200"');
      expect(result.body).toContain('"400"');
      expect(result.body).toContain('"403"');
      expect(result.body).toContain('"500"');
    });
  });

  describe("Formato de respuesta compatible con API Gateway v2", () => {
    it("respuesta tiene statusCode, headers y body", async () => {
      const event = createEvent("/webhooks/docs");
      const result = await invokeHandler(event);

      expect(result).toHaveProperty("statusCode");
      expect(result).toHaveProperty("headers");
      expect(result).toHaveProperty("body");
      expect(typeof result.statusCode).toBe("number");
      expect(typeof result.body).toBe("string");
    });
  });
});
