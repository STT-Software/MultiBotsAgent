import { mongoDbUri } from "../databases/mongodb";
import { encryptionKey } from "../shared/secrets";
import { servicesApiUrl } from "./services-api";
import { telegramIncomingQueue, telegramOutgoingQueue } from "../queues/telegram-queues";

/**
 * Lambda que consume mensajes entrantes de Telegram y los redirige al motor NestJS.
 */
export const telegramIncomingProcessor = new sst.aws.Function("TelegramIncomingProcessor", {
  handler: "apps/functions/src/handlers/telegram/incoming-processor.handler.handler",
  timeout: "30 seconds",
  memory: "256 MB",
  permissions: [
    {
      actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      resources: [telegramIncomingQueue.arn],
    },
    {
      actions: ["sqs:SendMessage"],
      resources: [telegramOutgoingQueue.arn],
    },
  ],
  environment: {
    SERVICES_API_URL: servicesApiUrl,
    TELEGRAM_OUTGOING_QUEUE_URL: telegramOutgoingQueue.url,
  },
});

telegramIncomingQueue.subscribe(telegramIncomingProcessor.arn);

/**
 * Lambda que consume mensajes salientes (respuestas) y los envía a la API de Telegram.
 */
export const telegramSenderHandler = new sst.aws.Function("TelegramSenderHandler", {
  handler: "apps/functions/src/handlers/telegram/sender.handler.handler",
  timeout: "30 seconds",
  memory: "256 MB",
  permissions: [
    {
      actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      resources: [telegramOutgoingQueue.arn],
    },
  ],
  environment: {
    MONGODB_URI: mongoDbUri.value,
    ENCRYPTION_KEY: encryptionKey.value,
  },
});

telegramOutgoingQueue.subscribe(telegramSenderHandler.arn);
