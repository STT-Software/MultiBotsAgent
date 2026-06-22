import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const INTEGRATIONS_COLLECTION = "integrations";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `integrations` (SL13).
 *
 * Representa el vínculo OAuth entre una empresa y un proveedor externo
 * (Google Drive, Notion, Calendar, etc.). Los tokens se almacenan cifrados
 * (AES-256-GCM) y nunca se exponen al frontend.
 *
 * Tenancy: por empresa (`companyId`), no por agente. El índice único
 * `{companyId, provider}` garantiza una sola integración por proveedor/empresa.
 */
export interface IntegrationDocument {
  _id: ObjectId;
  companyId: ObjectId;
  provider:
    | "google_drive"
    | "notion"
    | "confluence"
    | "sharepoint"
    | "dropbox"
    | "google_calendar";
  category: "document_source" | "calendar";
  status:
    | "connected"
    | "disconnected"
    | "requires_reconnection"
    | "insufficient_scopes";
  encryptedAccessToken?: {
    ciphertext: string;
    iv: string;
    tag: string;
  };
  encryptedRefreshToken?: {
    ciphertext: string;
    iv: string;
    tag: string;
  };
  tokenExpiresAt?: Date;
  scopes: string[];
  accountDisplayName?: string;
  providerAccountId?: string;
  calendarId?: string;
  lastHealthCheck?: Date;
  connectedAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `integrations`.
 * Se registran mediante el script de migración (task 1.3).
 *
 * - companyId_provider_unique: una sola integración por proveedor y empresa.
 * - companyId: listado de integraciones de una empresa.
 * - status: barrido del health check sobre integraciones `connected`.
 */
export const INTEGRATIONS_INDEXES = [
  {
    key: { companyId: 1, provider: 1 },
    name: "companyId_provider_unique",
    unique: true,
  },
  {
    key: { companyId: 1 },
    name: "companyId",
  },
  {
    key: { status: 1 },
    name: "status",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

/**
 * Sub-esquema reutilizable para un token cifrado AES-256-GCM.
 */
const ENCRYPTED_TOKEN_SCHEMA = {
  bsonType: "object",
  required: ["ciphertext", "iv", "tag"],
  properties: {
    ciphertext: { bsonType: "string", description: "Token cifrado en Base64" },
    iv: { bsonType: "string", description: "Vector de inicialización en Base64" },
    tag: { bsonType: "string", description: "Auth tag GCM en Base64" },
  },
} as const;

/**
 * JSON Schema para validación a nivel de MongoDB.
 * Se aplica al crear la colección con `createCollection`.
 */
export const INTEGRATIONS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    // `encryptedAccessToken` NO es requerido: una integración `disconnected`
    // conserva el registro sin material de tokens (R6).
    required: [
      "companyId",
      "provider",
      "category",
      "status",
      "scopes",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      companyId: {
        bsonType: "objectId",
        description: "ID de la empresa propietaria — requerido",
      },
      provider: {
        bsonType: "string",
        enum: [
          "google_drive",
          "notion",
          "confluence",
          "sharepoint",
          "dropbox",
          "google_calendar",
        ],
        description: "Proveedor externo conectado — requerido",
      },
      category: {
        bsonType: "string",
        enum: ["document_source", "calendar"],
        description: "Categoría del proveedor — requerido",
      },
      status: {
        bsonType: "string",
        enum: [
          "connected",
          "disconnected",
          "requires_reconnection",
          "insufficient_scopes",
        ],
        description: "Estado de salud de la integración — requerido",
      },
      encryptedAccessToken: {
        ...ENCRYPTED_TOKEN_SCHEMA,
        description: "Access token cifrado con AES-256-GCM — requerido",
      },
      encryptedRefreshToken: {
        ...ENCRYPTED_TOKEN_SCHEMA,
        description: "Refresh token cifrado con AES-256-GCM — opcional",
      },
      tokenExpiresAt: {
        bsonType: "date",
        description: "Expiración del access token — opcional",
      },
      scopes: {
        bsonType: "array",
        items: { bsonType: "string" },
        description: "Scopes concedidos por el proveedor — requerido",
      },
      accountDisplayName: {
        bsonType: "string",
        description: "Nombre legible de la cuenta vinculada — opcional",
      },
      providerAccountId: {
        bsonType: "string",
        description: "ID del usuario/cuenta en el proveedor — opcional",
      },
      calendarId: {
        bsonType: "string",
        description: "Calendario seleccionado (solo google_calendar) — opcional",
      },
      lastHealthCheck: {
        bsonType: "date",
        description: "Última validación exitosa del token — opcional",
      },
      connectedAt: {
        bsonType: "date",
        description: "Timestamp de conexión — opcional",
      },
      lastUsedAt: {
        bsonType: "date",
        description: "Último uso por un consumidor interno — opcional",
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
