import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { verifyWebhook } from "@multibotagents/core/whatsapp";
import { logger } from "../../shared/logger";

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const mode = event.queryStringParameters?.["hub.mode"];
    const verifyToken = event.queryStringParameters?.["hub.verify_token"];
    const challenge = event.queryStringParameters?.["hub.challenge"];

    const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN;

    const result = verifyWebhook({
      mode,
      verifyToken,
      challenge,
      configuredToken,
    });

    if (result.success) {
      logger.info("Webhook verification successful");
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/plain" },
        body: result.body,
      };
    }

    if (result.statusCode === 500) {
      logger.error("WHATSAPP_VERIFY_TOKEN env var not configured");
    } else {
      logger.warn("Webhook verification failed", {
        statusCode: result.statusCode,
        mode: mode ?? "absent",
      });
    }

    return {
      statusCode: result.statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorBody(result.statusCode)),
    };
  } catch (error: unknown) {
    logger.error("Unexpected error in verify-webhook handler", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}

function errorBody(statusCode: number): { error: string } {
  switch (statusCode) {
    case 400:
      return { error: "Missing required parameters" };
    case 403:
      return { error: "Forbidden" };
    default:
      return { error: "Internal server error" };
  }
}
