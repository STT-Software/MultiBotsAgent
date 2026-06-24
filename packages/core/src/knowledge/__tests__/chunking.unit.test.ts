/**
 * Unit tests para ChunkingService.
 *
 * Verifica edge cases y comportamiento específico del servicio de chunking.
 * Valida: Requisitos 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkingService } from '../chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    service = new ChunkingService();
  });

  // ─── countTokens ─────────────────────────────────────────────────────────────

  describe('countTokens', () => {
    it('debe retornar 0 para texto vacío', () => {
      expect(service.countTokens('')).toBe(0);
    });

    it('debe contar tokens como ceil(palabras / 0.75)', () => {
      // 4 palabras → ceil(4 / 0.75) = ceil(5.33) = 6
      expect(service.countTokens('una dos tres cuatro')).toBe(6);
    });

    it('debe manejar múltiples espacios entre palabras', () => {
      // 3 palabras → ceil(3 / 0.75) = ceil(4) = 4
      expect(service.countTokens('hola   mundo   test')).toBe(4);
    });

    it('debe manejar texto con saltos de línea', () => {
      // 4 palabras → ceil(4 / 0.75) = ceil(5.33) = 6
      expect(service.countTokens('hola\nmundo\ntest\nfin')).toBe(6);
    });

    it('debe manejar una sola palabra', () => {
      // 1 palabra → ceil(1 / 0.75) = ceil(1.33) = 2
      expect(service.countTokens('hola')).toBe(2);
    });
  });

  // ─── chunkPlainText ──────────────────────────────────────────────────────────

  describe('chunkPlainText', () => {
    it('debe retornar array vacío para texto vacío', () => {
      expect(service.chunkPlainText('', 'source-1')).toEqual([]);
    });

    it('debe retornar array vacío para texto con solo espacios', () => {
      expect(service.chunkPlainText('   \n\n   ', 'source-1')).toEqual([]);
    });

    it('debe retornar un solo chunk para texto corto', () => {
      const text = 'Este es un texto corto que cabe en un solo chunk.';
      const chunks = service.chunkPlainText(text, 'source-1');

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
      expect(chunks[0].position).toBe(0);
      expect(chunks[0].metadata.sourceId).toBe('source-1');
    });

    it('debe asignar posiciones secuenciales empezando en 0', () => {
      // Generar texto con suficientes párrafos para crear múltiples chunks (cada párrafo ~400 tokens)
      const paragraphs = Array.from({ length: 10 }, (_, i) => {
        const words = Array.from(
          { length: 300 },
          (_, j) => `palabra${i}_${j}`,
        ).join(' ');
        return `Párrafo ${i + 1}: ${words}`;
      });
      const text = paragraphs.join('\n\n');
      const chunks = service.chunkPlainText(text, 'source-1');

      expect(chunks.length).toBeGreaterThan(1);
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].position).toBe(i);
      }
    });

    it('debe respetar límites de párrafo (no cortar párrafos)', () => {
      const paragraph1 = 'Primer párrafo con contenido importante.';
      const paragraph2 = 'Segundo párrafo con más información relevante.';
      const text = `${paragraph1}\n\n${paragraph2}`;

      const chunks = service.chunkPlainText(text, 'source-1');

      // Ambos párrafos caben en un chunk, deben estar juntos
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toContain(paragraph1);
      expect(chunks[0].content).toContain(paragraph2);
    });

    it('debe subdividir párrafos > 800 tokens en oraciones', () => {
      // Crear un párrafo muy largo (> 800 tokens)
      const sentences = Array.from(
        { length: 50 },
        (_, i) =>
          `Esta es la oración número ${i + 1} que contiene varias palabras para generar tokens suficientes.`,
      );
      const longParagraph = sentences.join(' ');
      const chunks = service.chunkPlainText(longParagraph, 'source-1');

      expect(chunks.length).toBeGreaterThan(1);
      // Cada chunk debe terminar en un límite de oración (., !, ?)
      // excepto posiblemente el último
    });

    it('debe fusionar fragmentos < 50 tokens con el adyacente', () => {
      // Un párrafo muy corto seguido de uno normal
      const shortParagraph = 'Hola.';
      const normalParagraph =
        'Este es un párrafo normal con contenido suficiente para ser un chunk válido por sí mismo con más de cincuenta tokens de contenido textual que permite verificar la fusión correcta de fragmentos pequeños.';
      const text = `${shortParagraph}\n\n${normalParagraph}`;

      const chunks = service.chunkPlainText(text, 'source-1');

      // El párrafo corto debe haberse fusionado con el normal
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toContain(shortParagraph);
      expect(chunks[0].content).toContain(normalParagraph);
    });

    it('debe incluir tokenCount correcto en cada chunk', () => {
      const text =
        'Este texto tiene varias palabras para verificar el conteo de tokens.';
      const chunks = service.chunkPlainText(text, 'source-1');

      expect(chunks[0].tokenCount).toBe(service.countTokens(chunks[0].content));
    });

    it('debe asignar sourceId correcto en metadata', () => {
      const text = 'Contenido de prueba para verificar sourceId.';
      const chunks = service.chunkPlainText(text, 'mi-source-id');

      expect(chunks[0].metadata.sourceId).toBe('mi-source-id');
    });
  });

  // ─── chunkMarkdown ───────────────────────────────────────────────────────────

  describe('chunkMarkdown', () => {
    it('debe retornar array vacío para texto vacío', () => {
      expect(service.chunkMarkdown('', 'source-1')).toEqual([]);
    });

    it('debe usar headers h1-h3 como separadores naturales', () => {
      const markdown = [
        '# Título Principal',
        '',
        'Contenido de la primera sección con suficientes palabras para superar el mínimo de tokens requerido por el servicio de chunking.',
        '',
        '## Subtítulo',
        '',
        'Contenido de la segunda sección también con suficientes palabras para superar el mínimo de tokens requerido por el servicio.',
      ].join('\n');

      const chunks = service.chunkMarkdown(markdown, 'source-1');

      expect(chunks.length).toBeGreaterThanOrEqual(1);
      // Verificar que los headers actúan como separadores
      expect(chunks[0].metadata.section).toBeDefined();
    });

    it('debe mantener sección completa si cabe en targetTokens', () => {
      const markdown = [
        '# Sección Corta',
        '',
        'Este es contenido breve que cabe en un solo chunk sin problemas.',
      ].join('\n');

      const chunks = service.chunkMarkdown(markdown, 'source-1');

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toContain('# Sección Corta');
      expect(chunks[0].content).toContain('Este es contenido breve');
    });

    it('debe subdividir secciones grandes por párrafos', () => {
      const largeSectionContent = Array.from({ length: 10 }, (_, i) => {
        const words = Array.from(
          { length: 300 },
          (_, j) => `palabra${i}_${j}`,
        ).join(' ');
        return `Párrafo ${i + 1}: ${words}`;
      }).join('\n\n');

      const markdown = `# Sección Grande\n\n${largeSectionContent}`;
      const chunks = service.chunkMarkdown(markdown, 'source-1');

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('debe asignar metadata de sección (header) a cada chunk', () => {
      const markdown = [
        '# Mi Sección',
        '',
        'Contenido de la sección con suficientes palabras para superar el mínimo de tokens requerido por el servicio de chunking inteligente.',
      ].join('\n');

      const chunks = service.chunkMarkdown(markdown, 'source-1');

      expect(chunks[0].metadata.section).toBe('Mi Sección');
    });

    it('debe manejar contenido antes del primer header', () => {
      const markdown = [
        'Contenido introductorio antes de cualquier header con suficientes palabras para superar el mínimo de tokens.',
        '',
        '# Primer Header',
        '',
        'Contenido después del header con suficientes palabras para superar el mínimo de tokens requerido.',
      ].join('\n');

      const chunks = service.chunkMarkdown(markdown, 'source-1');

      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('debe ignorar headers h4+ como separadores', () => {
      const markdown = [
        '# Sección Principal',
        '',
        'Contenido principal con suficientes palabras para el mínimo de tokens.',
        '',
        '#### Sub-sub-sección',
        '',
        'Este header h4 no debe actuar como separador natural de secciones.',
      ].join('\n');

      const chunks = service.chunkMarkdown(markdown, 'source-1');

      // El h4 no debe crear una nueva sección
      expect(chunks[0].content).toContain('#### Sub-sub-sección');
    });

    it('debe asignar posiciones secuenciales', () => {
      const markdown = Array.from(
        { length: 5 },
        (_, i) =>
          `## Sección ${i + 1}\n\nContenido de la sección ${i + 1} con suficientes palabras para superar el mínimo de tokens requerido por el servicio de chunking inteligente y generar chunks válidos.`,
      ).join('\n\n');

      const chunks = service.chunkMarkdown(markdown, 'source-1');

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].position).toBe(i);
      }
    });
  });

  // ─── Overlap ─────────────────────────────────────────────────────────────────

  describe('overlap', () => {
    it('debe aplicar overlap entre chunks consecutivos', () => {
      // Crear texto suficiente para generar múltiples chunks
      const paragraphs = Array.from(
        { length: 30 },
        (_, i) =>
          `Este es el párrafo número ${i + 1} con contenido extenso suficiente para ocupar espacio significativo en tokens y forzar la creación de múltiples chunks separados en el resultado final del procesamiento del texto.`,
      );
      const text = paragraphs.join('\n\n');
      const chunks = service.chunkPlainText(text, 'source-1');

      if (chunks.length > 1) {
        // El segundo chunk debe contener texto del final del primero (overlap)
        const firstChunkWords = chunks[0].content.split(/\s+/);
        const lastWordsOfFirst = firstChunkWords.slice(-10).join(' ');

        // El overlap debe estar presente al inicio del segundo chunk
        expect(chunks[1].content).toContain(lastWordsOfFirst);
      }
    });
  });

  // ─── Round-trip preservation ─────────────────────────────────────────────────

  describe('round-trip preservation', () => {
    it('debe preservar todo el contenido original (sin overlap)', () => {
      const text =
        'Primera oración del documento. Segunda oración con más contenido. Tercera oración para completar el párrafo.';
      const chunks = service.chunkPlainText(text, 'source-1');

      // Para un solo chunk, el contenido debe ser el texto original
      if (chunks.length === 1) {
        expect(chunks[0].content).toBe(text);
      }
    });
  });
});
