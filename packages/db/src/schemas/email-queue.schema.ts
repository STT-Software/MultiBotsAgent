import { ObjectId } from "mongodb";
import type { EmailQueueStatus, EmailTemplate } from "@multibotagents/types";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const EMAIL_QUEUE_COLLECTION = "emailQueue";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `emailQueue`.
 * Extiende la entidad EmailQueueItem del dominio con campos específicos de MongoDB.
 */
export interface EmailQueueDocument {
  _id: ObjectId;
  to: string;
  template: EmailTemplate;
  payload: Record<string, unknown>;
  status: EmailQueueStatus;
  attempts: number;
  nextRetryAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `emailQueue`.
 * Se crean mediante un script de migración (task 6.2).
 *
 * - status + nextRetryAt: para el worker que procesa la cola
 * - createdAt: para monitoreo de antigüedad
 */
export const EMAIL_QUEUE_INDEXES = [
  {
    key: { status: 1, nextRetryAt: 1 },
    name: "status_nextRetryAt",
  },
  {
    key: { createdAt: 1 },
    name: "createdAt",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

/**
 * JSON Schema para validación a nivel de MongoDB.
 * Se aplica al crear la colección con `createCollection`.
 */
export const EMAIL_QUEUE_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "to",
      "template",
      "payload",
      "status",
      "attempts",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      to: {
        bsonType: "string",
        description: "Email destino — requerido",
      },
      template: {
        bsonType: "string",
        enum: ["verification", "password_reset", "escalation_alert"],
        description: "Template de email — requerido",
      },
      payload: {
        bsonType: "object",
        description: "Datos para el template — requerido",
      },
      status: {
        bsonType: "string",
        enum: ["pending", "processing", "sent", "failed"],
        description: "Estado del envío — requerido",
      },
      attempts: {
        bsonType: "int",
        minimum: 0,
        description: "Número de intentos realizados — requerido",
      },
      nextRetryAt: {
        bsonType: "date",
        description: "Fecha del próximo reintento — opcional",
      },
      lastError: {
        bsonType: "string",
        description: "Último error registrado — opcional",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
      updatedAt: {
        bsonType: "date",
        description: "Timestamp de última actualización — requerido",
      },
    },
  },
};
