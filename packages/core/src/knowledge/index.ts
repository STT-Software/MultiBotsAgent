/**
 * Módulo Knowledge — Barrel file
 *
 * Exporta la lógica pura de extracción de texto y chunking
 * para el pipeline de ingesta de documentos.
 */

// ChunkingService y tipos asociados
export {
  ChunkingService,
  DEFAULT_CHUNKING_CONFIG,
} from './chunking.service';
export type { ChunkingConfig, TextChunk } from './chunking.service';

// TextExtractor — Strategy pattern y factory
export {
  TextExtractionError,
  PdfExtractor,
  PlainTextExtractor,
  MarkdownExtractor,
  getExtractor,
} from './text-extractor';
export type {
  TextExtractionResult,
  TextExtractorStrategy,
} from './text-extractor';
