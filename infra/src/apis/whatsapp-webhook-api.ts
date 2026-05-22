/**
 * WhatsApp Webhook API — Rutas para verificación y recepción de webhooks de WhatsApp.
 *
 * Define:
 * - SST Secret para el verify token de WhatsApp
 * - Lambda handler para verificación del webhook (GET) y recepción de mensajes (POST)
 * - Rutas en API Gateway v2 (reutiliza functionsApi existente)
 *
 * El endpoint no requiere autorización a nivel de gateway (sin API key ni IAM auth).
 * La autenticación se realiza dentro de la Lambda mediante validación del verify_token.
 */

import { functionsApi } from "./functions-api";

// --- Secret ---

/**
 * Token personalizado para validar solicitudes de verificación de Meta.
 * Se configura por stage con: `sst secrets set WhatsAppVerifyToken "<value>" --stage <stage>`
 */
export const whatsAppVerifyToken = new sst.Secret("WhatsAppVerifyToken");

// --- Shared Function Config ---

const verifyWebhookHandler = {
  handler: "apps/functions/src/handlers/whatsapp/verify-webhook.handler.handler",
  runtime: "nodejs20.x" as const,
  memory: "128 MB" as const,
  timeout: "10 seconds" as const,
  environment: {
    WHATSAPP_VERIFY_TOKEN: whatsAppVerifyToken.value,
  },
};

const swaggerUiHandler = {
  handler: "apps/functions/src/handlers/whatsapp/swagger-ui.handler.handler",
  runtime: "nodejs20.x" as const,
  memory: "128 MB" as const,
  timeout: "10 seconds" as const,
};

// --- API Gateway Routes ---

/**
 * GET /webhooks/whatsapp — Verificación del webhook (Meta envía challenge).
 * Sin autorización a nivel de gateway.
 */
functionsApi.route("GET /webhooks/whatsapp", verifyWebhookHandler);

/**
 * POST /webhooks/whatsapp — Recepción de mensajes y eventos de WhatsApp.
 * Placeholder para futuros webhooks de mensajes entrantes.
 * Sin autorización a nivel de gateway (validación HMAC dentro de la Lambda).
 */
functionsApi.route("POST /webhooks/whatsapp", verifyWebhookHandler);

// --- Swagger UI (Documentación) ---

/**
 * GET /webhooks/docs — Sirve la página Swagger UI.
 * Sin autorización a nivel de gateway.
 */
functionsApi.route("GET /webhooks/docs", swaggerUiHandler);

/**
 * GET /webhooks/docs/spec — Sirve la especificación OpenAPI YAML.
 * Sin autorización a nivel de gateway.
 */
functionsApi.route("GET /webhooks/docs/spec", swaggerUiHandler);
