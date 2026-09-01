/**
 * Lambda de indexación — Procesamiento asíncrono de documentos.
 *
 * Consume mensajes de la Cola de Indexación (SQS) y ejecuta el pipeline:
 * extracción de texto → chunking → generación de embeddings → almacenamiento vectorial.
 *
 * Configuración:
 * - Timeout: 5 minutos (suficiente para procesar archivos de hasta 10 MB)
 * - Memoria: 1024 MB (necesaria para procesamiento de PDF y embeddings)
 * - Permisos: s3:GetObject sobre el bucket de conocimiento, bedrock:InvokeModel
 * - Environment: MONGODB_URI (secret), KNOWLEDGE_BUCKET (nombre del bucket)
 *
 * La Lambda se suscribe a la indexationQueue, que recibe eventos S3 PutObject
 * del knowledgeBucket cuando se sube un archivo de conocimiento.
 *
 * Requisitos: 11.4
 */

import { knowledgeBucket } from "../storage/knowledge-bucket";
import { indexationQueue } from "../queues/indexation-queue";
import { mongoDbUri } from "../databases/mongodb";

export const indexationHandler = new sst.aws.Function("IndexationHandler", {
  handler: "apps/functions/src/handlers/knowledge/indexation.handler.handler",
  timeout: "5 minutes",
  memory: "1024 MB",
  permissions: [
    {
      actions: ["s3:GetObject"],
      resources: [$interpolate`${knowledgeBucket.arn}/*`],
    },
    {
      actions: ["bedrock:InvokeModel"],
      resources: ["*"],
    },
    {
      actions: [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
      ],
      resources: [indexationQueue.arn],
    },
  ],
  environment: {
    MONGODB_URI: mongoDbUri.value,
    KNOWLEDGE_BUCKET: knowledgeBucket.name,
  },
});

/**
 * Suscripción de la Lambda a la cola de indexación.
 * Cuando un mensaje llega a la cola (evento S3 PutObject del bucket),
 * la Lambda se invoca automáticamente para procesar el documento.
 */
indexationQueue.subscribe(indexationHandler.arn);
