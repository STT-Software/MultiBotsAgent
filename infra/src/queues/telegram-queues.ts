/**
 * Colas SQS para la mensajería de Telegram con Dead Letter Queues (DLQ).
 *
 * Define:
 * - TelegramIncomingQueue: Cola para mensajes entrantes (desde Telegram Webhook).
 * - TelegramOutgoingQueue: Cola para mensajes salientes (respuestas generadas hacia Telegram).
 */

/**
 * DLQ para mensajes entrantes de Telegram que fallan repetidamente.
 */
export const telegramIncomingDlq = new sst.aws.Queue("TelegramIncomingDlq", {
  // Atributo explícito necesario: el proveedor aws 7.x envía un
  // SetQueueAttributes vacío en colas sin atributos y AWS lo rechaza.
  visibilityTimeout: "60 seconds",
});

/**
 * Cola principal para procesar mensajes entrantes de Telegram.
 */
export const telegramIncomingQueue = new sst.aws.Queue("TelegramIncomingQueue", {
  dlq: telegramIncomingDlq.arn,
  visibilityTimeout: "60 seconds",
});

/**
 * DLQ para mensajes salientes de Telegram que fallan en el envío a la API de Telegram.
 */
export const telegramOutgoingDlq = new sst.aws.Queue("TelegramOutgoingDlq", {
  visibilityTimeout: "60 seconds",
});

/**
 * Cola principal para enviar respuestas salientes de Telegram.
 */
export const telegramOutgoingQueue = new sst.aws.Queue("TelegramOutgoingQueue", {
  dlq: telegramOutgoingDlq.arn,
  visibilityTimeout: "60 seconds",
});
