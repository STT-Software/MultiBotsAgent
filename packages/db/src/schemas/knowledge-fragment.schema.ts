import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const KNOWLEDGE_FRAGMENTS_COLLECTION = "knowledge_fragments";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

/**
 * Documento MongoDB para la colección `knowledge_fragments`.
 * Representa un fragmento de texto con su embedding vectorial,
 * resultado del chunking de un KnowledgeSource.
 *
 * Valida: Requisitos 12.2, 12.4
 */
export interface KnowledgeFragmentDocument {
  _id: ObjectId;
  sourceId: string;
  agentId: string;
  content: string;
  /** Vector float de 1024 dimensiones generado por Amazon Titan Embeddings v2 */
  embedding: number[];
  position: number;
  tokenCount: number;
  metadata: {
    section?: string;
    page?: number;
    sourceTitle: string;
  };
  createdAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

/**
 * Índices para la colección `knowledge_fragments`.
 * Se crean mediante un script de migración.
 *
 * - sourceId: para eliminación eficiente en cascada (Requisito 12.4)
 */
export const KNOWLEDGE_FRAGMENTS_INDEXES = [
  {
    key: { sourceId: 1 },
    name: "sourceId",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

/**
 * JSON Schema para validación a nivel de MongoDB.
 * Se aplica al crear la colección con `createCollection`.
 */
export const KNOWLEDGE_FRAGMENTS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "sourceId",
      "agentId",
      "content",
      "embedding",
      "position",
      "tokenCount",
      "metadata",
      "createdAt",
    ],
    properties: {
      sourceId: {
        bsonType: "string",
        description: "Referencia al KnowledgeSource origen — requerido",
      },
      agentId: {
        bsonType: "string",
        description:
          "ID del agente desnormalizado para filtrado en búsquedas vectoriales — requerido",
      },
      content: {
        bsonType: "string",
        description: "Contenido textual del fragmento — requerido",
      },
      embedding: {
        bsonType: "array",
        items: {
          bsonType: "double",
        },
        description:
          "Vector de embedding de 1024 dimensiones (Amazon Titan Embeddings v2) — requerido",
      },
      position: {
        bsonType: "int",
        description: "Índice secuencial del fragmento dentro del documento — requerido",
      },
      tokenCount: {
        bsonType: "int",
        description: "Cantidad de tokens del fragmento — requerido",
      },
      metadata: {
        bsonType: "object",
        required: ["sourceTitle"],
        properties: {
          section: {
            bsonType: "string",
            description: "Sección del documento (header Markdown) — opcional",
          },
          page: {
            bsonType: "int",
            description: "Número de página (para PDFs) — opcional",
          },
          sourceTitle: {
            bsonType: "string",
            description: "Título del documento fuente — requerido",
          },
        },
        description: "Metadata del fragmento — requerido",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
    },
  },
};
