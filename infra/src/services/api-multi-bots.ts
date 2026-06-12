/**
 * API Multi Bots — Servicio Fargate para la API NestJS.
 *
 * Despliega el servicio api-multi-bots en ECS Fargate con capacidad SPOT.
 * Usa el Dockerfile del servicio con el contexto del monorepo root.
 * Recibe la URI de MongoDB como variable de entorno desde SST Secrets.
 *
 * El service registry en puerto 3001 habilita el descubrimiento de servicio
 * y la exposición pública vía API Gateway automáticamente.
 */

import { cluster } from "./cluster";
import { mongoDbUri } from "../databases/mongodb";
import { companyLogosBucket } from "../storage/company-logos";
import { knowledgeBucket } from "../storage/knowledge-bucket";
import { indexationQueue } from "../queues/indexation-queue";
import { whatsAppOutgoingQueue, whatsAppIncomingQueue } from "../queues/whatsapp-queues";
import { telegramOutgoingQueue, telegramIncomingQueue } from "../queues/telegram-queues";

import {
  jwtSecrets,
  captchaSecret,
  captchaVerifyUrl,
  elasticEmailApiKey,
  elasticEmailFromEmail,
  elasticEmailFromName,
  elasticEmailTemplateId,
  elasticEmailPasswordResetTemplateId,
  elasticEmailOrderClientTemplateId,
  elasticEmailOrderOperatorTemplateId,
  elasticEmailEscalationAlertTemplateId,
  elasticEmailNewBookingAlertTemplateId,
  elasticEmailBookingConfirmedTemplateId,
  elasticEmailBookingRescheduledTemplateId,
  elasticEmailBookingCancelledTemplateId,
  frontendDomain,
  metaAppId,
  metaAppSecret,
  encryptionKey,
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  openaiApiKey,
} from "../shared/secrets";

/**
 * URL del frontend para construir links de verificación de email.
 * - En `sst dev`: http://localhost:3000 (Next.js local)
 * - En deploy: se toma del secret FrontendDomain
 */
const frontendDomainValue = $dev ? "http://localhost:3000" : frontendDomain.value;

export const apiMultiBots = new sst.aws.Service("ApiMultiBots", {
  cluster,
  image: {
    context: ".",
    dockerfile: "apps/services/api-multi-bots/Dockerfile",
  },
  cpu: "0.25 vCPU",
  memory: "0.5 GB",
  capacity: "spot",
  permissions: [
    {
      actions: ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"],
      resources: [$interpolate`arn:aws:s3:::${companyLogosBucket.name}/*`],
    },
    {
      actions: ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"],
      resources: [$interpolate`arn:aws:s3:::${knowledgeBucket.name}/*`],
    },
    {
      actions: ["sqs:SendMessage"],
      resources: [indexationQueue.arn],
    },
    {
      actions: ["sqs:SendMessage"],
      resources: [whatsAppOutgoingQueue.arn],
    },
    {
      actions: ["sqs:SendMessage"],
      resources: [whatsAppIncomingQueue.arn],
    },
    {
      actions: ["sqs:SendMessage"],
      resources: [telegramOutgoingQueue.arn],
    },
    {
      actions: ["sqs:SendMessage"],
      resources: [telegramIncomingQueue.arn],
    },
    {
      actions: ["bedrock:InvokeModel"],
      resources: ["*"],
    },
  ],
  environment: {
    MONGODB_URI: mongoDbUri.value,
    JWT_SECRETS: jwtSecrets.value,
    CAPTCHA_SECRET: captchaSecret.value,
    CAPTCHA_VERIFY_URL: captchaVerifyUrl.value,
    ELASTIC_EMAIL_API_KEY: elasticEmailApiKey.value,
    ELASTIC_EMAIL_FROM_EMAIL: elasticEmailFromEmail.value,
    ELASTIC_EMAIL_FROM_NAME: elasticEmailFromName.value,
    ELASTIC_EMAIL_TEMPLATE_ID: elasticEmailTemplateId.value,
    ELASTIC_EMAIL_PASSWORD_RESET_TEMPLATE_ID: elasticEmailPasswordResetTemplateId.value,
    ELASTIC_EMAIL_ORDER_CLIENT_TEMPLATE_ID: elasticEmailOrderClientTemplateId.value,
    ELASTIC_EMAIL_ORDER_OPERATOR_TEMPLATE_ID: elasticEmailOrderOperatorTemplateId.value,
    ELASTIC_EMAIL_ESCALATION_ALERT_TEMPLATE_ID: elasticEmailEscalationAlertTemplateId.value,
    ELASTIC_EMAIL_NEW_BOOKING_ALERT_TEMPLATE_ID: elasticEmailNewBookingAlertTemplateId.value,
    ELASTIC_EMAIL_BOOKING_CONFIRMED_TEMPLATE_ID: elasticEmailBookingConfirmedTemplateId.value,
    ELASTIC_EMAIL_BOOKING_RESCHEDULED_TEMPLATE_ID: elasticEmailBookingRescheduledTemplateId.value,
    ELASTIC_EMAIL_BOOKING_CANCELLED_TEMPLATE_ID: elasticEmailBookingCancelledTemplateId.value,
    FRONTEND_DOMAIN: frontendDomainValue,
    COMPANY_LOGOS_BUCKET: companyLogosBucket.name,
    KNOWLEDGE_BUCKET: knowledgeBucket.name,
    INDEXATION_QUEUE_URL: indexationQueue.url,
    WHATSAPP_OUTGOING_QUEUE_URL: whatsAppOutgoingQueue.url,
    WHATSAPP_INCOMING_QUEUE_URL: whatsAppIncomingQueue.url,
    TELEGRAM_OUTGOING_QUEUE_URL: telegramOutgoingQueue.url,
    TELEGRAM_INCOMING_QUEUE_URL: telegramIncomingQueue.url,

    META_APP_ID: metaAppId.value,
    META_APP_SECRET: metaAppSecret.value,
    ENCRYPTION_KEY: encryptionKey.value,
    GOOGLE_CLIENT_ID: googleClientId.value,
    GOOGLE_CLIENT_SECRET: googleClientSecret.value,
    GOOGLE_REDIRECT_URI: googleRedirectUri.value,
    OPENAI_API_KEY: openaiApiKey.value,
    MONGODB_VECTOR_INDEX: "knowledge_vector_index",
    BEDROCK_MODEL_ID: "minimax.minimax-m2.5",
    WEBHOOK_URL: process.env.WEBHOOK_URL || "",
  },
  logging: {
    retention: "1 month",
  },
  serviceRegistry: {
    port: 3001,
  },
  health: {
    command: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
    interval: "30 seconds",
    timeout: "5 seconds",
    retries: 3,
    startPeriod: "60 seconds",
  },
  dev: {
    command: "npx nest start --watch",
    directory: "apps/services/api-multi-bots",
  },
});

