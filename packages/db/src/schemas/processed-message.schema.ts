import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const PROCESSED_MESSAGES_COLLECTION = "processedMessages";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `processedMessages`.
 * Se utiliza para deduplicación (idempotencia) de webhooks de WhatsApp.
 */
export interface ProcessedMessageDocument {
  _id: ObjectId;
  waMessageId: string; // wamid único enviado por Meta
  receivedAt: Date;
  expiresAt: Date; // TTL para auto-limpieza
}

// ─── Index Definitions ───────────────────────────────────────────────────────

export const PROCESSED_MESSAGES_INDEXES = [
  {
    key: { waMessageId: 1 },
    name: "waMessageId_unique",
    unique: true,
  },
  {
    key: { expiresAt: 1 },
    name: "expiresAt_ttl",
    expireAfterSeconds: 0, // Auto-elimina cuando se cumple expiresAt
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

export const PROCESSED_MESSAGES_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: ["waMessageId", "receivedAt", "expiresAt"],
    properties: {
      waMessageId: {
        bsonType: "string",
        description: "ID de mensaje único de Meta (wamid) — requerido",
      },
      receivedAt: {
        bsonType: "date",
        description: "Fecha de recepción del webhook — requerido",
      },
      expiresAt: {
        bsonType: "date",
        description: "Fecha de expiración para el índice TTL — requerido",
      },
    },
  },
};
