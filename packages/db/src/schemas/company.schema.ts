import { ObjectId } from "mongodb";
import type {
  CompanySize,
  CompanyStatus,
  ReferralSource,
  ServiceCategory,
} from "@multibotagents/types";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const COMPANIES_COLLECTION = "companies";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `companies`.
 * Extiende la entidad Company del dominio con campos específicos de MongoDB.
 */
export interface CompanyDocument {
  _id: ObjectId;
  name: string;
  country: string;
  category: ServiceCategory;
  size: CompanySize;
  phone?: string;
  logo?: string;
  referralSource?: ReferralSource;
  status: CompanyStatus;
  escalationTimeoutMinutes?: number;
  deletionReqDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `companies`.
 * Se crean mediante un script de migración (task 6.2).
 */
export const COMPANIES_INDEXES = [
  {
    key: { status: 1, deletionReqDate: 1 },
    name: "status_deletionReqDate",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

/**
 * JSON Schema para validación a nivel de MongoDB.
 * Se aplica al crear la colección con `createCollection`.
 */
export const COMPANIES_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "name",
      "country",
      "category",
      "size",
      "status",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      name: {
        bsonType: "string",
        description: "Nombre de la empresa — requerido",
      },
      country: {
        bsonType: "string",
        description: "Código de país ISO 3166-1 alpha-2 — requerido",
      },
      category: {
        bsonType: "string",
        description: "Categoría de servicios — requerido",
      },
      size: {
        bsonType: "string",
        enum: ["1", "2-5", "6-10", "11-20", "20+"],
        description: "Tamaño de la empresa — requerido",
      },
      phone: {
        bsonType: "string",
        description: "Teléfono con código de país — opcional",
      },
      logo: {
        bsonType: "string",
        description: "URL del logo (S3) — opcional",
      },
      referralSource: {
        bsonType: "string",
        enum: [
          "youtube",
          "instagram",
          "facebook",
          "google",
          "referido",
          "otro",
        ],
        description: "Fuente de referencia — opcional",
      },
      status: {
        bsonType: "string",
        enum: ["active", "pending_deletion"],
        description: "Estado de la empresa — requerido",
      },
      deletionReqDate: {
        bsonType: "date",
        description: "Fecha de solicitud de eliminación — opcional",
      },
      escalationTimeoutMinutes: {
        bsonType: "int",
        minimum: 5,
        maximum: 1440,
        description: "Timeout de auto-devolución de escalamiento en minutos — opcional (default 60)",
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
