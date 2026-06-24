import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const CHAT_MEMORIES_COLLECTION = "chat_memories";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

export interface ChatMemoryDocument {
  _id: ObjectId;
  sessionId: string;
  messages: Array<{
    type: string;
    content: string;
    timestamp: Date;
    source?: string;
    isEscalated?: boolean;
    fileUrl?: string;
    messageType?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

export const CHAT_MEMORIES_INDEXES = [
  {
    key: { sessionId: 1 },
    name: "sessionId_unique",
    unique: true,
  },
  {
    key: { updatedAt: 1 },
    name: "updatedAt_ttl",
    expireAfterSeconds: 86400, // 24 horas por defecto
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

export const CHAT_MEMORIES_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: ["sessionId", "messages", "createdAt", "updatedAt"],
    properties: {
      sessionId: {
        bsonType: "string",
        description: "Identificador único de la sesión — requerido",
      },
      messages: {
        bsonType: "array",
        description: "Lista de mensajes de la sesión — requerido",
        items: {
          bsonType: "object",
          required: ["type", "content", "timestamp"],
          properties: {
            type: {
              bsonType: "string",
              enum: ["human", "ai", "system"],
              description: "Tipo de mensaje (human, ai, system) — requerido",
            },
            content: {
              bsonType: "string",
              description: "Contenido del mensaje — requerido",
            },
            timestamp: {
              bsonType: "date",
              description: "Timestamp del mensaje — requerido",
            },
            source: {
              bsonType: "string",
              enum: ["agent", "operator"],
              description: "Origen del mensaje (agent, operator) — opcional",
            },
            isEscalated: {
              bsonType: "bool",
              description: "Indica si el mensaje ocurrió durante un escalamiento — opcional",
            },
            fileUrl: {
              bsonType: "string",
              description: "URL del archivo adjunto en S3 — opcional",
            },
            messageType: {
              bsonType: "string",
              description: "Tipo original de mensaje (text, image, file) — opcional",
            },
          },
        },
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
      updatedAt: {
        bsonType: "date",
        description: "Timestamp de última actualización (usado para TTL) — requerido",
      },
    },
  },
};
