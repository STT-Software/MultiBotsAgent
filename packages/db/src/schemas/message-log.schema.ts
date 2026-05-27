import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const MESSAGE_LOGS_COLLECTION = "messageLogs";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `messageLogs`.
 * Registra auditoría del tráfico de mensajes entrantes y salientes.
 */
export interface MessageLogDocument {
  _id: ObjectId;
  channelId: ObjectId;
  conversationId: string;
  direction: "incoming" | "outgoing";
  waMessageId: string; // wamid de Meta
  content: string;
  status: "sent" | "delivered" | "read" | "failed";
  errorCode?: number;
  errorMessage?: string;
  timestamp: Date;
  statusUpdatedAt?: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

export const MESSAGE_LOGS_INDEXES = [
  {
    key: { waMessageId: 1 },
    name: "waMessageId_unique",
    unique: true,
  },
  {
    key: { channelId: 1 },
    name: "channelId",
  },
  {
    key: { conversationId: 1 },
    name: "conversationId",
  },
  {
    key: { timestamp: -1 },
    name: "timestamp_desc",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

export const MESSAGE_LOGS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: ["channelId", "conversationId", "direction", "waMessageId", "content", "status", "timestamp"],
    properties: {
      channelId: {
        bsonType: "objectId",
        description: "ID del canal de WhatsApp asociado — requerido",
      },
      conversationId: {
        bsonType: "string",
        description: "ID de la conversación — requerido",
      },
      direction: {
        bsonType: "string",
        enum: ["incoming", "outgoing"],
        description: "Dirección del mensaje (entrante o saliente) — requerido",
      },
      waMessageId: {
        bsonType: "string",
        description: "ID de mensaje único de Meta (wamid) — requerido",
      },
      content: {
        bsonType: "string",
        description: "Contenido de texto del mensaje — requerido",
      },
      status: {
        bsonType: "string",
        enum: ["sent", "delivered", "read", "failed"],
        description: "Estado de entrega del mensaje — requerido",
      },
      errorCode: {
        bsonType: "int",
        description: "Código de error de Meta si falla — opcional",
      },
      errorMessage: {
        bsonType: "string",
        description: "Descripción de error de Meta si falla — opcional",
      },
      timestamp: {
        bsonType: "date",
        description: "Fecha y hora del mensaje — requerido",
      },
      statusUpdatedAt: {
        bsonType: "date",
        description: "Último cambio de estado del mensaje — opcional",
      },
    },
  },
};
