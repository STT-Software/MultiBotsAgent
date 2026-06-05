import type { SQSEvent, SQSRecord } from "aws-lambda";
import { MongoClient, ObjectId } from "mongodb";
import { decryptToken } from "@multibotagents/core";
import { ChannelRepository, MessageLogRepository } from "@multibotagents/db";
import type { TelegramOutgoingMessageEvent, MessageLog } from "@multibotagents/types";

// --- Logger estructurado ---
function log(level: "INFO" | "ERROR" | "WARN", message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const dataStr = data && Object.keys(data).length > 0 ? " " + JSON.stringify(data) : "";
  console.log(`[${ts}] ${level.padEnd(5)} [TelegramSenderHandler] ${message}${dataStr}`);
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
      log("ERROR", "Error enviando record de SQS a Telegram", {
        recordId: record.messageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  log("INFO", "Envío de todos los records de SQS completado");
}

async function processRecord(record: SQSRecord): Promise<void> {
  const outgoing: TelegramOutgoingMessageEvent = JSON.parse(record.body);
  const { channelId, conversationId, messages } = outgoing;

  log("INFO", "Iniciando proceso de envío a Telegram Bot API", {
    channelId,
    conversationId,
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

  // 2. Descifrar el Token del Bot
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY no está configurada");
  }

  let botToken: string;
  try {
    botToken = decryptToken(channel.encryptedToken, encryptionKey);
  } catch (error) {
    throw new Error(`Error descifrando el token del bot: ${error instanceof Error ? error.message : String(error)}`);
  }

  const chatId = conversationId.replace('telegram_', '');
  const isNumericChatId = /^\d+$/.test(chatId);
  const isSimulated = !isNumericChatId || botToken.includes('fake') || botToken.includes('mock') || botToken === 'simulated-token';

  // 3. Enviar cada mensaje individual
  for (const msg of messages) {
    if (msg.type !== "text" || !msg.content) {
      log("WARN", "Tipo de mensaje no soportado para envío a Telegram", { type: msg.type });
      continue;
    }

    let telegramMessageId = `msg.local_${new ObjectId().toHexString()}`; // ID local fallback
    let status: MessageLog["status"] = "sent";
    let errorCode: number | undefined;
    let errorMessage: string | undefined;

    if (!isSimulated) {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: parseInt(chatId, 10),
            text: msg.content,
          }),
        });

        interface TelegramResponse {
          ok: boolean;
          description?: string;
          result?: { message_id: number };
        }
        const responseBody = (await response.json().catch(() => ({}))) as TelegramResponse;

        if (!response.ok) {
          status = "failed";
          errorCode = response.status;
          errorMessage = responseBody.description || response.statusText;
          log("ERROR", "Llamada fallida a Telegram Bot API", {
            statusCode: response.status,
            responseBody: responseBody as unknown as Record<string, unknown>,
          });
        } else {
          telegramMessageId = responseBody.result?.message_id 
            ? `tgmid.real_${responseBody.result.message_id}` 
            : telegramMessageId;
          log("INFO", "Mensaje enviado exitosamente a Telegram Bot API", {
            telegramMessageId,
            chatId,
          });
        }
      } catch (fetchError: unknown) {
        status = "failed";
        errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        log("ERROR", "Error de red al llamar a Telegram Bot API", { errorMessage });
      }
    } else {
      log("INFO", "Omitiendo envío real a Telegram por chat_id simulado o token de prueba", {
        chatId,
      });
    }

    // 4. Registrar en MessageLogs
    const logRecord: Omit<MessageLog, "id"> = {
      channelId,
      conversationId,
      direction: "outgoing",
      waMessageId: telegramMessageId, // Mantenemos compatibilidad de schema en la BD usando waMessageId para el ID externo
      content: msg.content,
      status,
      timestamp: new Date(),
      statusUpdatedAt: new Date(),
      errorCode,
      errorMessage,
    };

    await logRepo.create(logRecord);

    if (status === "failed") {
      throw new Error(`Fallo en el envío a Telegram: ${errorMessage || "Unknown error"} (código ${errorCode})`);
    }
  }
}
