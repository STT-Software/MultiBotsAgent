/**
 * Tipos de UI para el feature Knowledge Base.
 * Define interfaces de props, estados locales y configuración visual.
 */

import type { KnowledgeSource } from '@multibotagents/types';

// ─── Status Visual ───────────────────────────────────────────────────────────

/** Variantes de estado visual para indicadores */
export type StatusVariant = 'processing' | 'indexed' | 'failed' | 'partial';

/** Configuración visual por estado */
export interface StatusConfig {
  color: string;
  bgColor: string;
  label: string;
  pulse: boolean;
}

// ─── Component Props ─────────────────────────────────────────────────────────

/** Props del componente de fila de fuente */
export interface SourceRowProps {
  source: KnowledgeSource;
  onDelete: (sourceId: string) => void;
  onReprocess: (sourceId: string) => void;
  onSelect: (source: KnowledgeSource) => void;
}

/** Props del contenedor principal */
export interface KnowledgeContainerProps {
  agentId: string;
}

/** Props del componente de lista */
export interface SourceListProps {
  sources: KnowledgeSource[];
  onDelete: (sourceId: string) => void;
  onReprocess: (sourceId: string) => void;
  onSelect: (source: KnowledgeSource) => void;
}

/** Props de la zona de carga */
export interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  progress: number;
  isUploading: boolean;
  error: string | null;
}

/** Props del editor de texto */
export interface TextEditorProps {
  isOpen: boolean;
  title: string;
  content: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
}

/** Props del detalle de fuente */
export interface SourceDetailProps {
  source: KnowledgeSource;
  onClose: () => void;
  onDelete: (sourceId: string) => void;
  onReprocess: (sourceId: string) => void;
}

// ─── Dialog State ────────────────────────────────────────────────────────────

/** Estado del diálogo de eliminación */
export interface DeleteDialogState {
  isOpen: boolean;
  source: KnowledgeSource | null;
  isDeleting: boolean;
}

// ─── Validación ──────────────────────────────────────────────────────────────

/** Formatos soportados para validación cliente */
export const SUPPORTED_FORMATS = ['pdf', 'txt', 'md'] as const;
export type SupportedFormatUI = (typeof SUPPORTED_FORMATS)[number];

/** Tamaño máximo de archivo: 10 MB */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
