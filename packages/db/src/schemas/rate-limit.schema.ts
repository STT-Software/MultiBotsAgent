import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const RATE_LIMITS_COLLECTION = "rateLimits";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `rateLimits`.
 * Almacena contadores de intentos fallidos de login por IP o email.
 */
export interface RateLimitDocument {
  _id: ObjectId;
  /** Clave del registro: "ip:<dirección_ip>" o "email:<dirección_email>". */
  key: string;
  /** Contador de intentos fallidos. */
  attempts: number;
  /** Fecha hasta la cual está bloqueado (null si no bloqueado). */
  blockedUntil: Date | null;
  /** Fecha de expiración para TTL index (auto-limpieza). */
  expiresAt: Date;
  /** Timestamp de creación. */
  createdAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `rateLimits`.
 *
 * - key: unique para búsqueda rápida y upsert atómico
 * - expiresAt: TTL index (expireAfterSeconds: 0) para auto-limpieza
 */
export const RATE_LIMITS_INDEXES = [
  {
    key: { key: 1 },
    name: "key_unique",
    unique: true,
  },
  {
    key: { expiresAt: 1 },
    name: "expiresAt_ttl",
    expireAfterSeconds: 0,
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

/**
 * JSON Schema para validación a nivel de MongoDB.
 * Se aplica al crear la colección con `createCollection`.
 */
export const RATE_LIMITS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: ["key", "attempts", "expiresAt", "createdAt"],
    properties: {
      key: {
        bsonType: "string",
        description: "Clave del rate limit (ip:<ip> o email:<email>) — requerido",
      },
      attempts: {
        bsonType: "int",
        description: "Contador de intentos fallidos — requerido",
      },
      blockedUntil: {
        bsonType: ["date", "null"],
        description: "Fecha de bloqueo (null si no bloqueado)",
      },
      expiresAt: {
        bsonType: "date",
        description: "Fecha de expiración para TTL — requerido",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
    },
  },
};
