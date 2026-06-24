import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const CHANNELS_COLLECTION = "channels";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `channels`.
 * Representa la conexión entre un agente y un número de WhatsApp.
 * Contiene credenciales cifradas (AES-256-GCM) y estado de conexión.
 */
export interface ChannelDocument {
  _id: ObjectId;
  companyId: ObjectId;
  agentId: ObjectId;
  provider: "whatsapp" | "telegram";
  status: "connected" | "disconnected" | "requires_reconnection" | "partially_connected";
  phoneNumberId?: string;
  wabaId?: string;
  telegramBotUsername?: string;
  encryptedToken: {
    ciphertext: string;
    iv: string;
    tag: string;
  };
  displayName: string;
  webhookOverrideUrl?: string;
  connectedAt: Date;
  lastHealthCheck?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `channels`.
 *
 * - phoneNumberId_unique_active: Garantiza que un número solo puede estar
 *   asociado a un agente activo (connected o partially_connected) a la vez.
 * - agentId: Búsqueda rápida de canales por agente.
 * - companyId: Búsqueda rápida de canales por empresa.
 */
export const CHANNELS_INDEXES = [
  {
    key: { phoneNumberId: 1 },
    name: "phoneNumberId_unique_active",
    unique: true,
    sparse: true,
    partialFilterExpression: {
      status: { $in: ["connected", "partially_connected"] },
      phoneNumberId: { $type: "string" },
    },
  },
  {
    key: { agentId: 1 },
    name: "agentId",
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
export const CHANNELS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "companyId",
      "agentId",
      "provider",
      "status",
      "encryptedToken",
      "displayName",
      "connectedAt",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      companyId: {
        bsonType: "objectId",
        description: "ID de la empresa propietaria — requerido",
      },
      agentId: {
        bsonType: "objectId",
        description: "ID del agente asociado — requerido",
      },
      provider: {
        bsonType: "string",
        enum: ["whatsapp", "telegram"],
        description: "Proveedor del canal — requerido",
      },
      status: {
        bsonType: "string",
        enum: ["connected", "disconnected", "requires_reconnection", "partially_connected"],
        description: "Estado de conexión del canal — requerido",
      },
      phoneNumberId: {
        bsonType: "string",
        description: "ID del número de teléfono en Meta — opcional para otros canales",
      },
      wabaId: {
        bsonType: "string",
        description: "ID del WhatsApp Business Account — opcional para otros canales",
      },
      telegramBotUsername: {
        bsonType: "string",
        description: "Username del bot de Telegram — opcional",
      },
      encryptedToken: {
        bsonType: "object",
        required: ["ciphertext", "iv", "tag"],
        properties: {
          ciphertext: {
            bsonType: "string",
            description: "Token cifrado en Base64",
          },
          iv: {
            bsonType: "string",
            description: "Vector de inicialización en Base64",
          },
          tag: {
            bsonType: "string",
            description: "Auth tag GCM en Base64",
          },
        },
        description: "Business Token cifrado con AES-256-GCM — requerido",
      },
      displayName: {
        bsonType: "string",
        description: "Nombre de display del número — requerido",
      },
      webhookOverrideUrl: {
        bsonType: "string",
        description: "URL del webhook override — opcional",
      },
      connectedAt: {
        bsonType: "date",
        description: "Timestamp de conexión — requerido",
      },
      lastHealthCheck: {
        bsonType: "date",
        description: "Último health check — opcional",
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
