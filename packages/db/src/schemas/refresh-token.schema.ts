import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const REFRESH_TOKENS_COLLECTION = "refreshTokens";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `refreshTokens`.
 * Extiende la entidad RefreshToken del dominio con campos específicos de MongoDB.
 */
export interface RefreshTokenDocument {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `refreshTokens`.
 * Se crean mediante un script de migración (task 6.2).
 *
 * - token: unique para búsqueda rápida en refresh
 * - userId + revoked: para revocar tokens previos
 * - expiresAt: TTL index (expireAfterSeconds: 0) para limpieza automática
 */
export const REFRESH_TOKENS_INDEXES = [
  {
    key: { token: 1 },
    name: "token_unique",
    unique: true,
  },
  {
    key: { userId: 1, revoked: 1 },
    name: "userId_revoked",
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
export const REFRESH_TOKENS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "token", "expiresAt", "revoked", "createdAt"],
    properties: {
      userId: {
        bsonType: "objectId",
        description: "Referencia al usuario propietario — requerido",
      },
      token: {
        bsonType: "string",
        description:
          "Token opaco (crypto.randomBytes(64).toString('hex')) — requerido",
      },
      expiresAt: {
        bsonType: "date",
        description: "Fecha de expiración (7 días) — requerido",
      },
      revoked: {
        bsonType: "bool",
        description: "Si el token fue revocado — requerido",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
    },
  },
};
