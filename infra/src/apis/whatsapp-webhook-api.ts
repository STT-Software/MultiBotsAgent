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
import { mongoDbUri } from "../databases/mongodb";
import { metaAppSecret, encryptionKey } from "../shared/secrets";
import { whatsAppIncomingQueue, whatsAppOutgoingQueue } from "../queues/whatsapp-queues";
import { servicesApiUrl } from "./services-api";
import { companyLogosBucket } from "../storage/company-logos";

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

const receiveWebhookHandler = {
  handler: "apps/functions/src/handlers/whatsapp/receive-webhook.handler.handler",
  runtime: "nodejs20.x" as const,
  memory: "256 MB" as const,
  timeout: "10 seconds" as const,
  environment: {
    MONGODB_URI: mongoDbUri.value,
    META_APP_SECRET: metaAppSecret.value,
    WHATSAPP_INCOMING_QUEUE_URL: whatsAppIncomingQueue.url,
    COMPANY_LOGOS_BUCKET: companyLogosBucket.name,
    COMPANY_LOGOS_REGION: "us-east-1",
    ENCRYPTION_KEY: encryptionKey.value,
  },
  permissions: [
    {
      actions: ["sqs:SendMessage"],
      resources: [whatsAppIncomingQueue.arn],
    },
    {
      actions: ["s3:PutObject", "s3:PutObjectAcl", "s3:GetObject"],
      resources: [$interpolate`arn:aws:s3:::${companyLogosBucket.name}/*`],
    },
  ],
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
 * Sin autorización a nivel de gateway (validación HMAC dentro de la Lambda).
 */
functionsApi.route("POST /webhooks/whatsapp", receiveWebhookHandler);

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

// --- SQS Lambda Consumers ---

/**
 * Lambda que consume mensajes entrantes de WhatsApp y los redirige al motor NestJS.
 */
export const whatsAppIncomingProcessor = new sst.aws.Function("WhatsAppIncomingProcessor", {
  handler: "apps/functions/src/handlers/whatsapp/incoming-processor.handler.handler",
  timeout: "30 seconds",
  memory: "256 MB",
  permissions: [
    {
      actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      resources: [whatsAppIncomingQueue.arn],
    },
    {
      actions: ["sqs:SendMessage"],
      resources: [whatsAppOutgoingQueue.arn],
    },
  ],
  environment: {
    SERVICES_API_URL: servicesApiUrl,
    WHATSAPP_OUTGOING_QUEUE_URL: whatsAppOutgoingQueue.url,
  },
});

whatsAppIncomingQueue.subscribe(whatsAppIncomingProcessor.arn);

/**
 * Lambda que consume mensajes salientes (respuestas) y los envía a la API de Meta.
 */
export const whatsAppSenderHandler = new sst.aws.Function("WhatsAppSenderHandler", {
  handler: "apps/functions/src/handlers/whatsapp/sender.handler.handler",
  timeout: "30 seconds",
  memory: "256 MB",
  permissions: [
    {
      actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      resources: [whatsAppOutgoingQueue.arn],
    },
  ],
  environment: {
    MONGODB_URI: mongoDbUri.value,
    ENCRYPTION_KEY: encryptionKey.value,
  },
});

whatsAppOutgoingQueue.subscribe(whatsAppSenderHandler.arn);
