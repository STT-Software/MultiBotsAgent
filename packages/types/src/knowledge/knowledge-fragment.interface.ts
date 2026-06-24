/**
 * Interface del modelo KnowledgeFragment.
 * Representa un fragmento de texto con su embedding vectorial,
 * resultado del chunking de un KnowledgeSource.
 *
 * Valida: Requisito 12.2
 */

/**
 * Fragmento de texto indexado con embedding vectorial.
 * Pertenece a un KnowledgeSource y está optimizado para búsqueda semántica.
 */
export interface KnowledgeFragment {
  id: string;
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
