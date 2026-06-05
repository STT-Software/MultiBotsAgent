import type { SQSEvent, SQSRecord } from "aws-lambda";
import { MongoClient, ObjectId } from "mongodb";
import { decryptToken } from "@multibotagents/core";
import { ChannelRepository, MessageLogRepository } from "@multibotagents/db";
import type { OutgoingMessageEvent, MessageLog } from "@multibotagents/types";

// --- Logger estructurado ---
function log(level: "INFO" | "ERROR" | "WARN", message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const dataStr = data && Object.keys(data).length > 0 ? " " + JSON.stringify(data) : "";
  console.log(`[${ts}] ${level.padEnd(5)} [WhatsAppSenderHandler] ${message}${dataStr}`);
}

let mongoClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI no está configurada");
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    log("INFO", "Conexión a MongoDB establecida");
  }
  return mongoClient;
}

export async function handler(event: SQSEvent): Promise<void> {
  log("INFO", `Recibidos ${event.Records.length} mensaje(s) de SQS para enviar`);

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error: unknown) {
      log("ERROR", "Error enviando record de SQS a Meta", {
        recordId: record.messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  log("INFO", "Envío de todos los records de SQS completado");
}

async function processRecord(record: SQSRecord): Promise<void> {
  const outgoing: OutgoingMessageEvent = JSON.parse(record.body);
  const { channelId, phoneNumberId, recipientPhone, conversationId, messages } = outgoing;

  log("INFO", "Iniciando proceso de envío a Meta Cloud API", {
    channelId,
    phoneNumberId,
    recipient: recipientPhone,
  });

  const client = await getMongoClient();
  const db = client.db();
  const channelRepo = new ChannelRepository(db);
  const logRepo = new MessageLogRepository(db);

  // 1. Obtener canal de la BD
  const channel = await channelRepo.findById(channelId);
  if (!channel) {
    throw new Error(`Canal no encontrado en la base de datos: ${channelId}`);
  }

  // 2. Descifrar el Business Token
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY no está configurada");
  }

  let businessToken: string;
  try {
    businessToken = decryptToken(channel.encryptedToken, encryptionKey);
  } catch (error) {
    throw new Error(`Error descifrando el token del canal: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (channel.provider !== 'whatsapp') {
    throw new Error(`WhatsAppSenderHandler recibió un mensaje para un canal con proveedor: ${channel.provider}`);
  }

  // 3. Enviar cada mensaje individual
  for (const msg of messages) {
    // Solo enviamos mensajes del tipo texto
    if (msg.type !== "text" || !msg.content) {
      log("WARN", "Tipo de mensaje no soportado para envío a Meta", { type: msg.type });
      continue;
    }

    let metaMessageId = `msg.local_${new ObjectId().toHexString()}`; // ID local fallback
    let status: MessageLog["status"] = "sent";
    let errorCode: number | undefined;
    let errorMessage: string | undefined;

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${businessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "text",
          text: {
            preview_url: false,
            body: msg.content,
          },
        }),
      });

      interface MetaResponse {
        error?: {
          code?: number;
          message?: string;
        };
        messages?: Array<{ id: string }>;
      }
      const responseBody = (await response.json().catch(() => ({}))) as MetaResponse;

      if (!response.ok) {
        status = "failed";
        errorCode = responseBody.error?.code || response.status;
        errorMessage = responseBody.error?.message || response.statusText;
        log("ERROR", "Llamada fallida a Meta Cloud API", {
          statusCode: response.status,
          responseBody: responseBody as unknown as Record<string, unknown>,
        });
      } else {
        metaMessageId = responseBody.messages?.[0]?.id || metaMessageId;
        log("INFO", "Mensaje enviado exitosamente a Meta Cloud API", {
          metaMessageId,
          recipient: recipientPhone,
        });
      }
    } catch (fetchError: unknown) {
      status = "failed";
      errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      log("ERROR", "Error de red al llamar a Meta Cloud API", { errorMessage });
    }

    // 4. Registrar en MessageLogs
    const logRecord: Omit<MessageLog, "id"> = {
      channelId,
      conversationId,
      direction: "outgoing",
      waMessageId: metaMessageId,
      content: msg.content,
      status,
      timestamp: new Date(),
      statusUpdatedAt: new Date(),
      errorCode,
      errorMessage,
    };

    await logRepo.create(logRecord);

    // Si el envío falló, lanzar error para que SQS reintente
    if (status === "failed") {
      throw new Error(`Fallo en el envío a Meta: ${errorMessage || "Unknown error"} (código ${errorCode})`);
    }
  }
}
