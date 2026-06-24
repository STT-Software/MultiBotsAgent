import { ObjectId } from "mongodb";
import type {
  KnowledgeSourceStatus,
  KnowledgeSourceType,
  ProcessingProgress,
  SupportedFormat,
} from "@multibotagents/types";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const KNOWLEDGE_SOURCES_COLLECTION = "knowledge_sources";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `knowledge_sources`.
 * Representa un documento o contenido textual subido por un administrador
 * a la base de conocimiento de un agente.
 *
 * Valida: Requisitos 12.1, 12.3
 */
export interface KnowledgeSourceDocument {
  _id: ObjectId;
  agentId: string;
  companyId: string;
  title: string;
  type: KnowledgeSourceType;
  format: SupportedFormat;
  originalFileKey: string;
  fileSizeBytes: number;
  status: KnowledgeSourceStatus;
  progress?: ProcessingProgress;
  fragmentCount: number;
  errorReason?: string;
  metadata: {
    category?: string;
    description?: string;
  };
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `knowledge_sources`.
 * Se crean mediante un script de migración.
 *
 * - agentId: para queries por agente individual
 * - agentId + status: índice compuesto para listado eficiente filtrado por estado
 */
export const KNOWLEDGE_SOURCES_INDEXES = [
  {
    key: { agentId: 1 },
    name: "agentId",
  },
  {
    key: { agentId: 1, status: 1 },
    name: "agentId_status",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

/**
 * JSON Schema para validación a nivel de MongoDB.
 * Se aplica al crear la colección con `createCollection`.
 */
export const KNOWLEDGE_SOURCES_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "agentId",
      "companyId",
      "title",
      "type",
      "format",
      "originalFileKey",
      "fileSizeBytes",
      "status",
      "fragmentCount",
      "metadata",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      agentId: {
        bsonType: "string",
        description: "ID del agente al que pertenece la fuente — requerido",
      },
      companyId: {
        bsonType: "string",
        description: "ID de la empresa propietaria — requerido",
      },
      title: {
        bsonType: "string",
        description: "Título del documento o contenido — requerido",
      },
      type: {
        bsonType: "string",
        enum: ["file", "text"],
        description: "Tipo de origen del contenido — requerido",
      },
      format: {
        bsonType: "string",
        enum: ["pdf", "txt", "md"],
        description: "Formato del archivo soportado en el MVP — requerido",
      },
      originalFileKey: {
        bsonType: "string",
        description: "Key del archivo original en S3 — requerido",
      },
      fileSizeBytes: {
        bsonType: "number",
        description: "Tamaño del archivo en bytes — requerido",
      },
      status: {
        bsonType: "string",
        enum: ["processing", "indexed", "failed", "partial"],
        description: "Estado del procesamiento — requerido",
      },
      progress: {
        bsonType: "string",
        enum: ["extracting", "chunking", "embedding", "storing"],
        description: "Etapa actual del procesamiento asíncrono — opcional",
      },
      fragmentCount: {
        bsonType: "number",
        description: "Cantidad de fragmentos generados — requerido",
      },
      errorReason: {
        bsonType: "string",
        description: "Razón del fallo si status es failed — opcional",
      },
      metadata: {
        bsonType: "object",
        description: "Metadata adicional del documento — requerido",
        properties: {
          category: {
            bsonType: "string",
            description: "Categoría del documento — opcional",
          },
          description: {
            bsonType: "string",
            description: "Descripción del documento — opcional",
          },
        },
      },
      processedAt: {
        bsonType: "date",
        description: "Fecha de finalización del procesamiento — opcional",
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
