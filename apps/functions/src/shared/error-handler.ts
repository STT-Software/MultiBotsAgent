import type { APIGatewayProxyResultV2 } from "aws-lambda";

export function parseBody<T>(body: string | null): T {
  if (!body) throw new Error("Request body is empty");
  return JSON.parse(body) as T;
}

export function successResponse(data: unknown, statusCode = 200): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export function errorResponse(message: string, statusCode = 400): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message }),
  };
}
