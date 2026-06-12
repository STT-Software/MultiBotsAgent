import type { SQSEvent, SQSRecord } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { IncomingMessageEvent, OutgoingMessageEvent, RagProcessOutput } from "@multibotagents/types";

// --- Logger estructurado ---
function log(level: "INFO" | "ERROR" | "WARN", message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const dataStr = data && Object.keys(data).length > 0 ? " " + JSON.stringify(data) : "";
  console.log(`[${ts}] ${level.padEnd(5)} [IncomingProcessorHandler] ${message}${dataStr}`);
}

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-1" });

export async function handler(event: SQSEvent): Promise<void> {
  log("INFO", `Recibidos ${event.Records.length} mensaje(s) de SQS para procesar`);

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error: unknown) {
      log("ERROR", "Error procesando record individual de SQS", {
        recordId: record.messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Volvemos a lanzar para que SQS reintente y mande al DLQ si persiste
      throw error;
    }
  }

  log("INFO", "Procesamiento de todos los records de SQS completado");
}

async function processRecord(record: SQSRecord): Promise<void> {
  const incoming: IncomingMessageEvent = JSON.parse(record.body);
  const { agentId, conversationId, messageText, timestamp, channelId, phoneNumberId, senderPhoneNumber, messageType, mediaId, mimeType, fileUrl } = incoming;

  log("INFO", "Iniciando procesamiento de consulta RAG vía NestJS Fargate", {
    agentId,
    conversationId,
    waMessageId: incoming.messageId,
  });

  const servicesApiUrl = process.env.SERVICES_API_URL;
  if (!servicesApiUrl) {
    throw new Error("SERVICES_API_URL no está configurada");
  }

  const url = `${servicesApiUrl}/internal/agents/${agentId}/process`;

  // Invocar NestJS RAG Engine
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      userMessage: messageText,
      timestamp,
      channelId,
      messageType,
      mediaId,
      mimeType,
      fileUrl,
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      log("WARN", `El agente ${agentId} no fue encontrado o está inactivo (404). Ignorando mensaje para evitar bucle de reintentos.`);
      return;
    }
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Llamada fallida a NestJS (${response.status}): ${errorBody || response.statusText}`
    );
  }

  const resultBody = (await response.json()) as RagProcessOutput;

  log("INFO", "Consulta procesada exitosamente por NestJS RAG Engine", {
    conversationId,
    messageCount: resultBody.messages?.length || 0,
    escalated: resultBody.escalated,
  });

  // Si no hay mensajes de respuesta, no encolamos nada a Meta
  if (!resultBody.messages || resultBody.messages.length === 0) {
    log("INFO", "No se generaron respuestas para enviar a Meta", { conversationId });
    return;
  }

  // Construir el evento de salida para la cola
  const outgoingEvent: OutgoingMessageEvent = {
    channelId,
    phoneNumberId,
    recipientPhone: senderPhoneNumber,
    conversationId,
    messages: resultBody.messages,
    escalated: resultBody.escalated,
    escalationReason: resultBody.escalationReason,
  };

  const outgoingQueueUrl = process.env.WHATSAPP_OUTGOING_QUEUE_URL;
  if (!outgoingQueueUrl) {
    throw new Error("WHATSAPP_OUTGOING_QUEUE_URL no está configurada");
  }

  // Encolar respuesta en la cola de salida para envío asíncrono
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: outgoingQueueUrl,
      MessageBody: JSON.stringify(outgoingEvent),
    })
  );

  log("INFO", "Evento de respuesta encolado exitosamente en WhatsAppOutgoingQueue", {
    conversationId,
    recipient: senderPhoneNumber,
  });
}
