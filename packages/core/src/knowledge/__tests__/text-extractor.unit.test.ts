/**
 * Unit tests para TextExtractor.
 *
 * Verifica la extracción de texto para diferentes formatos y el manejo de errores.
 * Valida: Requisitos 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect } from 'vitest';
import {
  PlainTextExtractor,
  MarkdownExtractor,
  PdfExtractor,
  TextExtractionError,
  getExtractor,
} from '../text-extractor';

// ─── PlainTextExtractor ────────────────────────────────────────────────────────

describe('PlainTextExtractor', () => {
  const extractor = new PlainTextExtractor();

  it('debe extraer texto UTF-8 con acentos correctamente', async () => {
    const content = 'Información técnica con acentos: á, é, í, ó, ú, ñ, ü';
    const buffer = Buffer.from(content, 'utf-8');

    const result = await extractor.extract(buffer);

    expect(result.text).toBe(content);
    expect(result.metadata.format).toBe('txt');
  });

  it('debe extraer texto UTF-8 con emojis correctamente', async () => {
    const content = 'Documento con emojis 🚀🎉✅ y caracteres especiales «»';
    const buffer = Buffer.from(content, 'utf-8');

    const result = await extractor.extract(buffer);

    expect(result.text).toBe(content);
    expect(result.metadata.format).toBe('txt');
  });

  it('debe extraer texto multilínea preservando saltos de línea', async () => {
    const content = 'Línea 1\nLínea 2\nLínea 3';
    const buffer = Buffer.from(content, 'utf-8');

    const result = await extractor.extract(buffer);

    expect(result.text).toBe(content);
    expect(result.metadata.format).toBe('txt');
  });

  it('debe lanzar TextExtractionError para buffer vacío', async () => {
    const buffer = Buffer.from('', 'utf-8');

    await expect(extractor.extract(buffer)).rejects.toThrow(TextExtractionError);
    await expect(extractor.extract(buffer)).rejects.toThrow(
      /vacío|espacios en blanco/,
    );
  });

  it('debe lanzar TextExtractionError para buffer con solo whitespace', async () => {
    const buffer = Buffer.from('   \n\t\n   ', 'utf-8');

    await expect(extractor.extract(buffer)).rejects.toThrow(TextExtractionError);
    await expect(extractor.extract(buffer)).rejects.toThrow(
      /vacío|espacios en blanco/,
    );
  });

  it('no debe incluir pageCount en metadata', async () => {
    const buffer = Buffer.from('Contenido simple', 'utf-8');

    const result = await extractor.extract(buffer);

    expect(result.metadata.pageCount).toBeUndefined();
  });
});

// ─── MarkdownExtractor ─────────────────────────────────────────────────────────

describe('MarkdownExtractor', () => {
  const extractor = new MarkdownExtractor();

  it('debe preservar estructura de headers en el texto extraído', async () => {
    const content = [
      '# Título Principal',
      '',
      'Contenido de la primera sección.',
      '',
      '## Subtítulo',
      '',
      'Contenido de la segunda sección.',
      '',
      '### Sub-subtítulo',
      '',
      'Contenido más profundo.',
    ].join('\n');
    const buffer = Buffer.from(content, 'utf-8');

    const result = await extractor.extract(buffer);

    expect(result.text).toBe(content);
    expect(result.text).toContain('# Título Principal');
    expect(result.text).toContain('## Subtítulo');
    expect(result.text).toContain('### Sub-subtítulo');
    expect(result.metadata.format).toBe('md');
  });

  it('debe preservar listas y formato markdown', async () => {
    const content = [
      '# Lista de tareas',
      '',
      '- Item 1',
      '- Item 2',
      '  - Sub-item 2.1',
      '',
      '1. Paso uno',
      '2. Paso dos',
    ].join('\n');
    const buffer = Buffer.from(content, 'utf-8');

    const result = await extractor.extract(buffer);

    expect(result.text).toBe(content);
    expect(result.metadata.format).toBe('md');
  });

  it('debe lanzar TextExtractionError para buffer vacío', async () => {
    const buffer = Buffer.from('', 'utf-8');

    await expect(extractor.extract(buffer)).rejects.toThrow(TextExtractionError);
    await expect(extractor.extract(buffer)).rejects.toThrow(
      /vacío|espacios en blanco/,
    );
  });

  it('debe lanzar TextExtractionError para buffer con solo whitespace', async () => {
    const buffer = Buffer.from('  \n\n  \t  ', 'utf-8');

    await expect(extractor.extract(buffer)).rejects.toThrow(TextExtractionError);
    await expect(extractor.extract(buffer)).rejects.toThrow(
      /vacío|espacios en blanco/,
    );
  });

  it('no debe incluir pageCount en metadata', async () => {
    const buffer = Buffer.from('# Header\n\nContenido', 'utf-8');

    const result = await extractor.extract(buffer);

    expect(result.metadata.pageCount).toBeUndefined();
  });
});

// ─── PdfExtractor ──────────────────────────────────────────────────────────────

describe('PdfExtractor', () => {
  const extractor = new PdfExtractor();

  it('debe lanzar TextExtractionError para buffer inválido (no es un PDF real)', async () => {
    const corruptBuffer = Buffer.from('esto no es un PDF válido', 'utf-8');

    await expect(extractor.extract(corruptBuffer)).rejects.toThrow(
      TextExtractionError,
    );
    await expect(extractor.extract(corruptBuffer)).rejects.toThrow(
      /Error al extraer texto del PDF|corrupto|formato no soportado/,
    );
  });

  it('debe lanzar TextExtractionError para buffer vacío', async () => {
    const emptyBuffer = Buffer.from('', 'utf-8');

    await expect(extractor.extract(emptyBuffer)).rejects.toThrow(
      TextExtractionError,
    );
  });
});

// ─── getExtractor (factory) ────────────────────────────────────────────────────

describe('getExtractor', () => {
  it('debe retornar PlainTextExtractor para formato "txt"', () => {
    const extractor = getExtractor('txt');

    expect(extractor).toBeInstanceOf(PlainTextExtractor);
  });

  it('debe retornar MarkdownExtractor para formato "md"', () => {
    const extractor = getExtractor('md');

    expect(extractor).toBeInstanceOf(MarkdownExtractor);
  });

  it('debe retornar PdfExtractor para formato "pdf"', () => {
    const extractor = getExtractor('pdf');

    expect(extractor).toBeInstanceOf(PdfExtractor);
  });
});
