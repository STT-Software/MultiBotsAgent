/**
 * Interfaces y tipos del modelo KnowledgeSource.
 * Representa un documento o contenido textual subido por un administrador
 * a la base de conocimiento de un agente.
 *
 * Valida: Requisito 12.1
 */

// ─── Tipos de estado y formato ───────────────────────────────────────────────

/** Estado del procesamiento de una fuente de conocimiento */
export type KnowledgeSourceStatus = 'processing' | 'indexed' | 'failed' | 'partial';

/** Tipo de origen del contenido */
export type KnowledgeSourceType = 'file' | 'text';

/** Formatos de archivo soportados en el MVP */
export type SupportedFormat = 'pdf' | 'txt' | 'md';

/** Etapa actual del procesamiento asíncrono */
export type ProcessingProgress = 'extracting' | 'chunking' | 'embedding' | 'storing';

// ─── Interface principal ─────────────────────────────────────────────────────

/**
 * Registro que representa un documento o contenido textual en la base de conocimiento.
 * Contiene metadata, estado del procesamiento y referencia al archivo original en S3.
 */
export interface KnowledgeSource {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}
