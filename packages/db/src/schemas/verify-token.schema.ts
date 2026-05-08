import { ObjectId } from "mongodb";
import type { VerifyTokenType } from "@multibotagents/types";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const VERIFY_TOKENS_COLLECTION = "verifyTokens";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `verifyTokens`.
 * Extiende la entidad VerifyToken del dominio con campos específicos de MongoDB.
 */
export interface VerifyTokenDocument {
  _id: ObjectId;
  userId: ObjectId;
  type: VerifyTokenType;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `verifyTokens`.
 * Se crean mediante un script de migración (task 6.2).
 *
 * - token: unique para búsqueda rápida
 * - expiresAt: TTL index (expireAfterSeconds: 0) para limpieza automática
 * - userId + type: para buscar tokens por usuario y tipo
 */
export const VERIFY_TOKENS_INDEXES = [
  {
    key: { token: 1 },
    name: "token_unique",
    unique: true,
  },
  {
    key: { expiresAt: 1 },
    name: "expiresAt_ttl",
    expireAfterSeconds: 0,
  },
  {
    key: { userId: 1, type: 1 },
    name: "userId_type",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

/**
 * JSON Schema para validación a nivel de MongoDB.
 * Se aplica al crear la colección con `createCollection`.
 */
export const VERIFY_TOKENS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "type", "token", "expiresAt", "createdAt"],
    properties: {
      userId: {
        bsonType: "objectId",
        description: "Referencia al usuario propietario — requerido",
      },
      type: {
        bsonType: "string",
        enum: ["email_verification", "password_reset"],
        description: "Tipo de token — requerido",
      },
      token: {
        bsonType: "string",
        description:
          "Token (crypto.randomBytes(32).toString('hex')) — requerido",
      },
      expiresAt: {
        bsonType: "date",
        description: "Fecha de expiración — requerido",
      },
      usedAt: {
        bsonType: "date",
        description: "Fecha de uso — opcional",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
    },
  },
};
