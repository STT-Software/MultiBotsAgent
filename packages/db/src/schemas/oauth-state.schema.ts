import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const OAUTH_STATES_COLLECTION = "oauthStates";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `oauthStates` (SL13).
 *
 * Persiste el `state` anti-CSRF del flujo OAuth. El `_id` es el `jti` del
 * state JWT firmado, de modo que el callback puede localizar el registro y
 * marcarlo como `used` para impedir el reuso del `code`. La limpieza es
 * automática vía índice TTL sobre `expiresAt` (10 min).
 */
export interface OAuthStateDocument {
  /** `jti` del state JWT firmado. */
  _id: string;
  companyId: ObjectId;
  agentId?: ObjectId;
  provider:
    | "google_drive"
    | "notion"
    | "confluence"
    | "sharepoint"
    | "dropbox"
    | "google_calendar";
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `oauthStates`.
 * Se registran mediante el script de migración (task 1.3).
 *
 * - expiresAt_ttl: TTL index (expireAfterSeconds: 0) que elimina los states
 *   vencidos automáticamente (ventana anti-CSRF de 10 min).
 */
export const OAUTH_STATES_INDEXES = [
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
 *
 * `_id` es un string (el `jti` del JWT), por lo que no se restringe a objectId.
 */
export const OAUTH_STATES_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: ["_id", "companyId", "provider", "used", "expiresAt", "createdAt"],
    properties: {
      _id: {
        bsonType: "string",
        description: "jti del state JWT firmado — requerido",
      },
      companyId: {
        bsonType: "objectId",
        description: "Empresa que inició el flujo — requerido",
      },
      agentId: {
        bsonType: "objectId",
        description: "Agente asociado al flujo — opcional",
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
        description: "Proveedor del flujo OAuth — requerido",
      },
      used: {
        bsonType: "bool",
        description: "Si el state ya fue consumido en un callback — requerido",
      },
      expiresAt: {
        bsonType: "date",
        description: "Expiración del state (TTL, 10 min) — requerido",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
    },
  },
};
