import type { Collection } from "mongodb";
import type { KnowledgeSearchResult } from "@multibotagents/types";
import type { KnowledgeFragmentDocument } from "../../schemas/knowledge-fragment.schema";

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Interfaz para el servicio de generación de embeddings vectoriales.
 * Abstrae el proveedor concreto (Bedrock, OpenAI, etc.) para desacoplar
 * la capa de datos del servicio de IA.
 */
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
}

/**
 * Interfaz para búsqueda semántica vectorial sobre fragmentos de conocimiento.
 * Implementa el contrato consumido por el Motor RAG (Solución 2).
 *
 * Valida: Requisitos 7.1, 7.2, 7.3, 7.4
 */
export interface IVectorSearchService {
  /**
   * Busca los fragmentos más relevantes para una query dada,
   * filtrados por agentId para garantizar aislamiento entre agentes.
   *
   * @param agentId - ID del agente para filtrado de aislamiento
   * @param query - Texto de la consulta del usuario
   * @param topK - Cantidad máxima de resultados a retornar
   * @returns Array de resultados ordenados por score descendente, vacío si no hay fragmentos
   */
  search(agentId: string, query: string, topK: number): Promise<KnowledgeSearchResult[]>;
}

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * Implementación de búsqueda vectorial usando MongoDB Atlas Vector Search.
 * Ejecuta `$vectorSearch` aggregation con filtro por agentId y configura
 * `numCandidates: topK * 10` para mejor recall.
 *
 * Valida: Requisitos 7.1, 7.2, 7.3, 7.4
 */
export class MongoVectorSearchService implements IVectorSearchService {
  constructor(
    private readonly collection: Collection<KnowledgeFragmentDocument>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(
    agentId: string,
    query: string,
    topK: number,
  ): Promise<KnowledgeSearchResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    const results = await this.collection
      .aggregate<{
        _id: { toHexString(): string };
        content: string;
        metadata: {
          sourceTitle: string;
          section?: string;
          page?: number;
        };
        sourceId: string;
        score: number;
      }>([
        {
          $vectorSearch: {
            index: "knowledge_vector_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: topK * 10,
            limit: topK,
            filter: { agentId },
          },
        },
        {
          $project: {
            _id: 1,
            content: 1,
            metadata: 1,
            sourceId: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ])
      .toArray();

    return results.map(mapToSearchResult);
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un resultado de la aggregation a KnowledgeSearchResult. */
function mapToSearchResult(doc: {
  _id: { toHexString(): string };
  content: string;
  metadata: {
    sourceTitle: string;
    section?: string;
    page?: number;
  };
  sourceId: string;
  score: number;
}): KnowledgeSearchResult {
  return {
    fragmentId: doc._id.toHexString(),
    content: doc.content,
    score: doc.score,
    metadata: {
      sourceId: doc.sourceId,
      sourceTitle: doc.metadata.sourceTitle,
      section: doc.metadata.section,
      page: doc.metadata.page,
    },
  };
}
