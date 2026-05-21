/**
 * Interface del resultado de búsqueda vectorial para el dominio Knowledge.
 * Retornado por VectorSearchService al Motor RAG con metadata tipada.
 *
 * Valida: Requisito 7.2
 */

/**
 * Metadata tipada del resultado de búsqueda de conocimiento.
 * Incluye referencia a la fuente y ubicación dentro del documento.
 */
export interface KnowledgeSearchMetadata {
  sourceId: string;
  sourceTitle: string;
  section?: string;
  page?: number;
}

/**
 * Resultado individual de búsqueda semántica sobre fragmentos de conocimiento.
 * Extiende el concepto de SearchResult con metadata específica del dominio.
 */
export interface KnowledgeSearchResult {
  fragmentId: string;
  content: string;
  /** Similitud coseno entre 0 y 1 */
  score: number;
  metadata: KnowledgeSearchMetadata;
}
