import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { BedrockEmbeddings } from '@langchain/aws';
import { MongoClient, type Collection, type Document } from 'mongodb';

import type { SearchResult, VectorSearchService } from '@multibotagents/types';

/**
 * Implementación de VectorSearchService usando MongoDB Atlas Vector Search.
 * Ejecuta búsqueda semántica vectorial filtrando por agentId y respetando topK.
 *
 * Usa BedrockEmbeddings (@langchain/aws) para convertir la query de texto
 * en un vector de embedding antes de ejecutar la búsqueda.
 *
 * Valida: Requisitos 3.1, 3.2, 10.3
 */
@Injectable()
export class MongoVectorSearchProvider implements VectorSearchService, OnModuleDestroy {
  private readonly logger = new Logger(MongoVectorSearchProvider.name);
  private readonly client: MongoClient;
  private readonly dbName: string;
  private readonly collectionName: string;
  private readonly indexName: string;
  private readonly embeddings: BedrockEmbeddings;
  private readonly embeddingFieldPath: string;

  constructor() {
    const connectionString =
      process.env.MONGODB_VECTOR_URI ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017';

    this.dbName = process.env.MONGODB_VECTOR_DB || process.env.MONGODB_DB || 'multibotagents';
    this.collectionName =
      process.env.MONGODB_VECTOR_COLLECTION || 'knowledge_fragments';
    this.indexName =
      process.env.MONGODB_VECTOR_INDEX || 'vector_index';
    this.embeddingFieldPath =
      process.env.MONGODB_VECTOR_FIELD || 'embedding';

    const embeddingModelId =
      process.env.BEDROCK_EMBEDDING_MODEL_ID ||
      'amazon.titan-embed-text-v2:0';
    const region = process.env.AWS_REGION || 'us-east-1';

    this.client = new MongoClient(connectionString);

    this.embeddings = new BedrockEmbeddings({
      model: embeddingModelId,
      region,
    });

    this.logger.log(
      `MongoVectorSearchProvider initialized: db=${this.dbName}, collection=${this.collectionName}, index=${this.indexName}, embeddingModel=${embeddingModelId}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.close();
      this.logger.log('MongoDB client connection closed');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Error closing MongoDB client', { error: err.message });
    }
  }

  /**
   * Ejecuta búsqueda vectorial semántica en MongoDB Atlas Vector Search.
   *
   * 1. Embede la query de texto usando BedrockEmbeddings
   * 2. Ejecuta $vectorSearch aggregation pipeline filtrando por agentId
   * 3. Mapea los resultados a SearchResult[]
   *
   * @param agentId - ID del agente para filtrar fragmentos de conocimiento
   * @param query - Texto de la consulta del usuario
   * @param topK - Número máximo de resultados a retornar
   * @returns Array de SearchResult ordenados por score descendente
   */
  async search(agentId: string, query: string, topK: number): Promise<SearchResult[]> {
    this.logger.debug('Starting vector search', { agentId, topK, queryLength: query.length });

    try {
      // 1. Embed the query text
      const queryVector = await this.embedQuery(query);

      // 2. Execute $vectorSearch aggregation with agentId filter
      const collection = this.getCollection();
      const results = await this.executeVectorSearch(
        collection,
        queryVector,
        agentId,
        topK,
      );

      // 3. Map results to SearchResult[]
      const searchResults = this.mapToSearchResults(results);

      this.logger.debug('Vector search completed', {
        agentId,
        resultsCount: searchResults.length,
        topK,
      });

      return searchResults;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Vector search failed', {
        agentId,
        error: err.message,
        stack: err.stack,
      });
      throw new Error(`Vector search failed: ${err.message}`);
    }
  }

  /**
   * Embede la query de texto usando BedrockEmbeddings.
   */
  private async embedQuery(query: string): Promise<number[]> {
    this.logger.debug('Embedding query text');
    const vector = await this.embeddings.embedQuery(query);
    this.logger.debug('Query embedded successfully', { dimensions: vector.length });
    return vector;
  }

  /**
   * Obtiene la referencia a la colección de MongoDB.
   */
  private getCollection(): Collection<Document> {
    return this.client.db(this.dbName).collection(this.collectionName);
  }

  /**
   * Ejecuta el pipeline de agregación $vectorSearch en MongoDB Atlas.
   */
  private async executeVectorSearch(
    collection: Collection<Document>,
    queryVector: number[],
    agentId: string,
    topK: number,
  ): Promise<Document[]> {
    const pipeline = [
      {
        $vectorSearch: {
          index: this.indexName,
          path: this.embeddingFieldPath,
          queryVector,
          numCandidates: topK * 10,
          limit: topK,
          filter: {
            agentId,
          },
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          agentId: 1,
          sourceId: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return results;
  }

  /**
   * Mapea documentos de MongoDB a SearchResult[].
   */
  private mapToSearchResults(documents: Document[]): SearchResult[] {
    return documents.map((doc) => ({
      fragmentId: String(doc._id),
      content: doc.content ?? '',
      score: typeof doc.score === 'number' ? doc.score : 0,
      metadata: {
        ...(doc.metadata ?? {}),
        sourceId: doc.sourceId,
        agentId: doc.agentId,
      },
    }));
  }
}
