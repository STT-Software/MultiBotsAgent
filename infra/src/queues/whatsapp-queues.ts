/**
 * Colas SQS para la mensajería de WhatsApp con Dead Letter Queues (DLQ).
 *
 * Define:
 * - WhatsAppIncomingQueue: Cola para mensajes entrantes (desde Meta Webhook).
 * - WhatsAppOutgoingQueue: Cola para mensajes salientes (respuestas generadas hacia Meta).
 */

/**
 * DLQ para mensajes entrantes de WhatsApp que fallan repetidamente.
 */
export const whatsAppIncomingDlq = new sst.aws.Queue("WhatsAppIncomingDlq");

/**
 * Cola principal para procesar mensajes entrantes de WhatsApp.
 */
export const whatsAppIncomingQueue = new sst.aws.Queue("WhatsAppIncomingQueue", {
  dlq: whatsAppIncomingDlq.arn,
  visibilityTimeout: "60 seconds",
});

/**
 * DLQ para mensajes salientes de WhatsApp que fallan en el envío a Meta.
 */
export const whatsAppOutgoingDlq = new sst.aws.Queue("WhatsAppOutgoingDlq");

/**
 * Cola principal para enviar respuestas salientes de WhatsApp.
 */
export const whatsAppOutgoingQueue = new sst.aws.Queue("WhatsAppOutgoingQueue", {
  dlq: whatsAppOutgoingDlq.arn,
  visibilityTimeout: "60 seconds",
});
