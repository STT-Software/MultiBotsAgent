/**
 * TextExtractor — Strategy pattern para extracción de texto por formato.
 *
 * Cada formato soportado (PDF, TXT, MD) tiene su propia estrategia de extracción.
 * La factory `getExtractor(format)` retorna la estrategia correcta.
 *
 * Valida: Requisitos 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { PDFParse } from 'pdf-parse';
import { SupportedFormat } from '@multibotagents/types';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** Resultado de la extracción de texto de un documento */
export interface TextExtractionResult {
  text: string;
  metadata: {
    pageCount?: number;
    format: SupportedFormat;
  };
}

/** Estrategia de extracción de texto */
export interface TextExtractorStrategy {
  extract(buffer: Buffer): Promise<TextExtractionResult>;
}

// ─── Error de extracción ─────────────────────────────────────────────────────

/** Error lanzado cuando la extracción de texto falla o produce contenido vacío */
export class TextExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextExtractionError';
  }
}

// ─── Estrategias ─────────────────────────────────────────────────────────────

/**
 * Extrae texto nativo de archivos PDF usando pdf-parse.
 * Valida: Requisito 3.1
 */
export class PdfExtractor implements TextExtractorStrategy {
  async extract(buffer: Buffer): Promise<TextExtractionResult> {
    try {
      const pdf = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await pdf.getText();

      const text = textResult.text;

      if (!text || text.trim().length === 0) {
        await pdf.destroy();
        throw new TextExtractionError(
          'No se pudo extraer texto del documento PDF. El archivo puede estar vacío o contener solo imágenes.',
        );
      }

      const pageCount = textResult.total;
      await pdf.destroy();

      return {
        text,
        metadata: {
          pageCount,
          format: 'pdf',
        },
      };
    } catch (error) {
      if (error instanceof TextExtractionError) {
        throw error;
      }
      throw new TextExtractionError(
        `Error al extraer texto del PDF: ${error instanceof Error ? error.message : 'archivo corrupto o formato no soportado'}`,
      );
    }
  }
}

/**
 * Lee archivos de texto plano directamente como UTF-8.
 * Valida: Requisito 3.2
 */
export class PlainTextExtractor implements TextExtractorStrategy {
  async extract(buffer: Buffer): Promise<TextExtractionResult> {
    const text = buffer.toString('utf-8');

    if (!text || text.trim().length === 0) {
      throw new TextExtractionError(
        'No se pudo extraer texto del documento. El archivo está vacío o contiene solo espacios en blanco.',
      );
    }

    return {
      text,
      metadata: {
        format: 'txt',
      },
    };
  }
}

/**
 * Lee archivos Markdown preservando la estructura de headers.
 * El texto se retorna tal cual para que el ChunkingService pueda
 * usar los headers como separadores naturales.
 * Valida: Requisito 3.3
 */
export class MarkdownExtractor implements TextExtractorStrategy {
  async extract(buffer: Buffer): Promise<TextExtractionResult> {
    const text = buffer.toString('utf-8');

    if (!text || text.trim().length === 0) {
      throw new TextExtractionError(
        'No se pudo extraer texto del documento Markdown. El archivo está vacío o contiene solo espacios en blanco.',
      );
    }

    return {
      text,
      metadata: {
        format: 'md',
      },
    };
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Retorna la estrategia de extracción correcta según el formato del archivo.
 *
 * @param format - Formato del archivo (pdf, txt, md)
 * @returns Instancia de la estrategia de extracción correspondiente
 */
export function getExtractor(format: SupportedFormat): TextExtractorStrategy {
  const extractors: Record<SupportedFormat, TextExtractorStrategy> = {
    pdf: new PdfExtractor(),
    txt: new PlainTextExtractor(),
    md: new MarkdownExtractor(),
  };

  return extractors[format];
}
