import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const USERS_COLLECTION = "users";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `users`.
 * Extiende la entidad User del dominio con campos específicos de MongoDB.
 */
export interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  companyId: ObjectId;
  activeSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `users`.
 * Se crean mediante un script de migración (task 6.2).
 *
 * - email: unique con collation strength 2 (case-insensitive)
 * - companyId: para queries por empresa
 */
export const USERS_INDEXES = [
  {
    key: { email: 1 },
    name: "email_unique_ci",
    unique: true,
    collation: { locale: "en", strength: 2 },
  },
  {
    key: { companyId: 1 },
    name: "companyId",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

/**
 * JSON Schema para validación a nivel de MongoDB.
 * Se aplica al crear la colección con `createCollection`.
 */
export const USERS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "email",
      "passwordHash",
      "emailVerified",
      "companyId",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      email: {
        bsonType: "string",
        description: "Email normalizado a minúsculas — requerido",
      },
      passwordHash: {
        bsonType: "string",
        description: "Hash bcrypt de la contraseña — requerido",
      },
      emailVerified: {
        bsonType: "bool",
        description: "Estado de verificación del email — requerido",
      },
      companyId: {
        bsonType: "objectId",
        description: "Referencia a la empresa — requerido",
      },
      activeSessionId: {
        bsonType: "string",
        description: "ID de sesión activa — opcional",
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
