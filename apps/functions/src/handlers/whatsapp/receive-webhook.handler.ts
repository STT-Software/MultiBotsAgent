import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { MongoClient } from "mongodb";
import { validateMetaSignature, decryptToken } from "@multibotagents/core";
import { ChannelRepository, ProcessedMessageRepository } from "@multibotagents/db";
import type { IncomingMessageEvent } from "@multibotagents/types";
import { randomUUID } from "crypto";

// --- Logger estructurado ---
function log(level: "INFO" | "ERROR" | "WARN", message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const dataStr = data && Object.keys(data).length > 0 ? " " + JSON.stringify(data) : "";
  console.log(`[${ts}] ${level.padEnd(5)} [ReceiveWebhookHandler] ${message}${dataStr}`);
}

// --- Clientes globales con reconexión/reutilización ---
let mongoClient: MongoClient | null = null;
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-1" });

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

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";

  // 1. Validar firma HMAC SHA-256 de Meta
  const signature = event.headers["x-hub-signature-256"] || event.headers["X-Hub-Signature-256"];
  const appSecret = process.env.META_APP_SECRET;

  if (!validateMetaSignature(rawBody, signature, appSecret)) {
    log("WARN", "Firma HMAC inválida o ausente", { signature: signature ?? "absent" });
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  try {
    const body = JSON.parse(rawBody);

    // Validar formato del webhook de Meta
    if (body.object !== "whatsapp_business_account" || !body.entry) {
      log("INFO", "Ignorando evento webhook que no es whatsapp_business_account");
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ignored" }),
      };
    }

    const client = await getMongoClient();
    const db = client.db();
    const channelRepo = new ChannelRepository(db);
    const processedRepo = new ProcessedMessageRepository(db);

    // Iterar por las entradas y los cambios
    for (const entry of body.entry) {
      if (!entry.changes) continue;

      for (const change of entry.changes) {
        const value = change.value;
        if (!value || !value.messages) continue;

        const phone_number_id = value.metadata?.phone_number_id;
        if (!phone_number_id) {
          log("WARN", "Webhook recibido sin phone_number_id en metadatos");
          continue;
        }

        // Buscar el canal de WhatsApp activo para el número destino
        const channel = await channelRepo.findActiveByPhoneNumberId(phone_number_id);
        if (!channel) {
          log("WARN", "Mensaje recibido para número sin canal de WhatsApp activo configurado", { phone_number_id });
          continue; // Silent discard
        }

        for (const message of value.messages) {
          const waMessageId = message.id;

          // Permitir mensajes del tipo texto, audio o imagen
          if (message.type !== "text" && message.type !== "audio" && message.type !== "image") {
            log("INFO", "Mensaje ignorado (tipo no soportado)", {
              waMessageId,
              type: message.type,
            });
            continue;
          }

          if (message.type === "text" && !message.text?.body) {
            log("INFO", "Mensaje de texto ignorado por cuerpo vacío", { waMessageId });
            continue;
          }

          if (message.type === "audio" && !message.audio?.id) {
            log("INFO", "Mensaje de audio ignorado por falta de media id", { waMessageId });
            continue;
          }

          if (message.type === "image" && !message.image?.id) {
            log("INFO", "Mensaje de imagen ignorado por falta de media id", { waMessageId });
            continue;
          }

          // 2. Control de Idempotencia (Deduplicación)
          const alreadyProcessed = await processedRepo.findByWaMessageId(waMessageId);
          if (alreadyProcessed) {
            log("INFO", "Mensaje ya procesado (idempotencia activa) — descartado", { waMessageId });
            continue;
          }

          // Registrar idempotencia por 24 horas
          await processedRepo.create({
            waMessageId,
            receivedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });

          const senderPhoneNumber = message.from;
          const isAudio = message.type === "audio";
          const isImage = message.type === "image";
          const messageText = isImage
            ? (message.image?.caption || "")
            : (isAudio ? "" : message.text?.body || "");
          const timestamp = message.timestamp; // Unix timestamp en segundos

          let fileUrl: string | undefined = undefined;
          if ((isAudio || isImage) && (message.audio?.id || message.image?.id)) {
            const mediaId = isAudio ? message.audio.id : message.image.id;
            const mimeType = isAudio ? message.audio.mime_type : message.image.mime_type;
            const encryptionKey = process.env.ENCRYPTION_KEY;
            if (encryptionKey && channel.encryptedToken) {
              try {
                const accessToken = decryptToken(channel.encryptedToken as any, encryptionKey);
                fileUrl = await downloadAndUploadWhatsAppMedia(
                  mediaId,
                  accessToken,
                  channel.companyId.toString(),
                  `whatsapp_${senderPhoneNumber}`,
                  isAudio ? "audio" : "image",
                  mimeType || (isAudio ? "audio/ogg" : "image/jpeg"),
                );
              } catch (err) {
                log("ERROR", "Error descifrando token para descargar multimedia", {
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            } else {
              log("WARN", "No se pudo obtener access token o ENCRYPTION_KEY para descargar multimedia");
            }
          }

          // Construir el evento de entrada para la cola
          const eventPayload: IncomingMessageEvent = {
            agentId: channel.agentId,
            companyId: channel.companyId,
            channelId: channel.id,
            conversationId: `whatsapp_${senderPhoneNumber}`,
            senderPhoneNumber,
            phoneNumberId: channel.phoneNumberId || phone_number_id,
            messageId: waMessageId,
            messageText,
            timestamp: new Date(parseInt(timestamp, 10) * 1000).toISOString(),
            messageType: isAudio ? "audio" : (isImage ? "image" : "text"),
            mediaId: isAudio ? message.audio.id : (isImage ? message.image.id : undefined),
            mimeType: isAudio ? message.audio.mime_type : (isImage ? message.image.mime_type : undefined),
            fileUrl,
          };

          // 3. Encolar el evento en SQS
          const queueUrl = process.env.WHATSAPP_INCOMING_QUEUE_URL;
          if (!queueUrl) {
            throw new Error("WHATSAPP_INCOMING_QUEUE_URL no está configurada");
          }

          await sqsClient.send(
            new SendMessageCommand({
              QueueUrl: queueUrl,
              MessageBody: JSON.stringify(eventPayload),
            })
          );

          log("INFO", "Mensaje recibido y encolado exitosamente", {
            waMessageId,
            agentId: channel.agentId,
            sender: senderPhoneNumber,
          });
        }
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "success" }),
    };
  } catch (error: unknown) {
    log("ERROR", "Error inesperado procesando webhook de WhatsApp", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}

async function downloadAndUploadWhatsAppMedia(
  mediaId: string,
  accessToken: string,
  companyId: string,
  conversationId: string,
  messageType: "audio" | "image",
  mimeType: string,
): Promise<string | undefined> {
  try {
    log("INFO", `Downloading media from Meta for mediaId=${mediaId}...`);
    const mediaUrlResponse = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaUrlResponse.ok) {
      const errText = await mediaUrlResponse.text();
      log("ERROR", `Failed to get media URL from Meta: ${errText}`);
      return undefined;
    }
    const mediaData = await mediaUrlResponse.json() as { url: string; mime_type?: string };
    if (!mediaData.url) {
      log("ERROR", `Meta media metadata did not return a URL: ${JSON.stringify(mediaData)}`);
      return undefined;
    }
    const resolvedMimeType = mediaData.mime_type || mimeType;

    const mediaDownloadResponse = await fetch(mediaData.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaDownloadResponse.ok) {
      const errText = await mediaDownloadResponse.text();
      log("ERROR", `Failed to download media binary from Meta: ${errText}`);
      return undefined;
    }
    const buffer = Buffer.from(await mediaDownloadResponse.arrayBuffer());

    const bucket = process.env.COMPANY_LOGOS_BUCKET;
    const region = process.env.COMPANY_LOGOS_REGION || "us-east-1";
    if (!bucket) {
      log("ERROR", "COMPANY_LOGOS_BUCKET environment variable is not defined");
      return undefined;
    }

    const s3Client = new S3Client({ region });
    const uuid = randomUUID();
    const ext = messageType === "audio"
      ? (resolvedMimeType.includes("ogg") ? "ogg" : "mp3")
      : (resolvedMimeType.includes("png") ? "png" : "jpg");
    const key = `escalamiento/${companyId}/${conversationId}/${uuid}-${mediaId}.${ext}`;

    log("INFO", `Uploading WhatsApp media to S3 with key: ${key}`);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: resolvedMimeType,
      }),
    );

    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    log("INFO", `WhatsApp media uploaded successfully to S3: ${fileUrl}`);
    return fileUrl;
  } catch (err) {
    log("ERROR", `Error downloading or uploading WhatsApp media: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}
