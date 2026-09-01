/**
 * Cola SQS de indexación con Dead Letter Queue.
 *
 * Recibe eventos S3 PutObject del knowledgeBucket cuando se sube un archivo
 * de conocimiento. La Lambda de indexación consume estos mensajes para
 * ejecutar el pipeline: extracción → chunking → embeddings → almacenamiento.
 *
 * - visibilityTimeout: 6 minutos (> Lambda timeout de 5 min)
 * - DLQ: mensajes que fallan 3 veces se envían a IndexationDlq
 *
 * Requisitos: 1.7, 11.1
 */

import { knowledgeBucket } from "../storage/knowledge-bucket";

/**
 * Dead Letter Queue para mensajes de indexación que fallan persistentemente.
 * Después de 3 reintentos fallidos, el mensaje se mueve aquí para
 * inspección y manejo manual o automático de errores.
 */
export const indexationDlq = new sst.aws.Queue("IndexationDlq", {
  // Atributo explícito necesario: el proveedor aws 7.x envía un
  // SetQueueAttributes vacío en colas sin atributos y AWS lo rechaza.
  visibilityTimeout: "6 minutes",
});

/**
 * Cola principal de indexación.
 * Recibe notificaciones S3 cuando se sube un archivo al knowledgeBucket.
 * La Lambda de indexación consume estos mensajes.
 */
export const indexationQueue = new sst.aws.Queue("IndexationQueue", {
  dlq: indexationDlq.arn,
  visibilityTimeout: "6 minutes",
});

/**
 * Suscripción del bucket de conocimiento a la cola de indexación.
 * Cuando se crea un objeto en el bucket (PutObject), se envía una
 * notificación a la cola para iniciar el procesamiento asíncrono.
 */
knowledgeBucket.notify({
  notifications: [
    {
      name: "IndexationQueueNotification",
      queue: indexationQueue,
      events: ["s3:ObjectCreated:*"],
    },
  ],
});
