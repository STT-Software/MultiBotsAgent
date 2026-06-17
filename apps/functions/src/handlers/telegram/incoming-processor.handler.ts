import type { SQSEvent, SQSRecord } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { TelegramIncomingMessageEvent, TelegramOutgoingMessageEvent, RagProcessOutput } from "@multibotagents/types";

// --- Logger estructurado ---
function log(level: "INFO" | "ERROR" | "WARN", message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const dataStr = data && Object.keys(data).length > 0 ? " " + JSON.stringify(data) : "";
  console.log(`[${ts}] ${level.padEnd(5)} [TelegramIncomingProcessorHandler] ${message}${dataStr}`);
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
      throw error;
    }
  }

  log("INFO", "Procesamiento de todos los records de SQS completado");
}

async function processRecord(record: SQSRecord): Promise<void> {
  const incoming: TelegramIncomingMessageEvent = JSON.parse(record.body);
  const { agentId, conversationId, messageText, timestamp, channelId, messageType, mediaId, mimeType, fileUrl } = incoming;

  log("INFO", "Iniciando procesamiento de consulta RAG vía NestJS Fargate", {
    agentId,
    conversationId,
    messageId: incoming.messageId,
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

  // Si no hay respuestas, no encolamos nada
  if (!resultBody.messages || resultBody.messages.length === 0) {
    log("INFO", "No se generaron respuestas para enviar a Telegram", { conversationId });
    return;
  }

  // Construir el evento de salida para la cola de Telegram
  const outgoingEvent: TelegramOutgoingMessageEvent = {
    channelId,
    conversationId,
    messages: resultBody.messages,
    escalated: resultBody.escalated,
    escalationReason: resultBody.escalationReason,
  };

  const outgoingQueueUrl = process.env.TELEGRAM_OUTGOING_QUEUE_URL;
  if (!outgoingQueueUrl) {
    throw new Error("TELEGRAM_OUTGOING_QUEUE_URL no está configurada");
  }

  // Encolar respuesta en la cola de salida de Telegram
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: outgoingQueueUrl,
      MessageBody: JSON.stringify(outgoingEvent),
    })
  );

  log("INFO", "Evento de respuesta encolado exitosamente en TelegramOutgoingQueue", {
    conversationId,
  });
}
