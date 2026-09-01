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
export const whatsAppIncomingDlq = new sst.aws.Queue("WhatsAppIncomingDlq", {
  // Atributo explícito necesario: el proveedor aws 7.x envía un
  // SetQueueAttributes vacío en colas sin atributos y AWS lo rechaza.
  visibilityTimeout: "60 seconds",
});

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
export const whatsAppOutgoingDlq = new sst.aws.Queue("WhatsAppOutgoingDlq", {
  visibilityTimeout: "60 seconds",
});

/**
 * Cola principal para enviar respuestas salientes de WhatsApp.
 */
export const whatsAppOutgoingQueue = new sst.aws.Queue("WhatsAppOutgoingQueue", {
  dlq: whatsAppOutgoingDlq.arn,
  visibilityTimeout: "60 seconds",
});
