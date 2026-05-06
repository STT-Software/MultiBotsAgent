import type { APIGatewayProxyEventV2 } from "aws-lambda";

/**
 * Extrae y valida headers comunes de un evento API Gateway.
 */
export function getCorrelationId(event: APIGatewayProxyEventV2): string {
  return event.headers["x-correlation-id"] || crypto.randomUUID();
}

/**
 * Verifica que el content-type sea application/json.
 */
export function isJsonRequest(event: APIGatewayProxyEventV2): boolean {
  const contentType = event.headers["content-type"] || "";
  return contentType.includes("application/json");
}
