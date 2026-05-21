/**
 * Property-Based Tests para ChunkingService.
 *
 * Property 4: Chunking preserves all content (round-trip)
 * Property 5: Chunk size bounds
 * Property 6: Paragraph boundary integrity
 * Property 7: Markdown section integrity
 * - Secciones completas (≤ 800 tokens) se mantienen como un solo chunk
 * - Headers h1-h3 actúan como separadores naturales de chunks
 * Property 8: Sequential chunk positions
 *
 * Feature: knowledge-base-ingestion
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9**
 */
import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { ChunkingService } from '../chunking.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const service = new ChunkingService();

/**
 * Genera una palabra aleatoria de longitud variable.
 */
const wordArb = fc.stringMatching(/^[a-z]{3,12}$/);

/**
 * Genera un párrafo de contenido con un número controlado de palabras.
 * Cada palabra ≈ 1.33 tokens (1 / 0.75), así que para N tokens necesitamos ~N * 0.75 palabras.
 */
function paragraphOfTokens(minTokens: number, maxTokens: number): fc.Arbitrary<string> {
  // Convertir tokens a palabras: tokens = ceil(words / 0.75) → words ≈ tokens * 0.75
  const minWords = Math.max(3, Math.floor(minTokens * 0.75));
  const maxWords = Math.floor(maxTokens * 0.75);

  return fc
    .array(wordArb, { minLength: minWords, maxLength: maxWords })
    .map((words) => words.join(' '));
}

/**
 * Genera un header markdown de nivel 1-3.
 */
const headerLevelArb = fc.constantFrom('#', '##', '###');

/**
 * Genera un título de header.
 */
const headerTitleArb = fc
  .array(wordArb, { minLength: 1, maxLength: 5 })
  .map((words) => words.join(' '));

/**
 * Genera una sección de markdown (header + contenido) que cabe en ≤ 800 tokens.
 * Limitamos el contenido a ~500 tokens para dejar margen al header.
 */
const markdownSectionArb = fc
  .tuple(headerLevelArb, headerTitleArb, paragraphOfTokens(30, 500))
  .map(([level, title, content]) => ({
    header: `${level} ${title}`,
    content,
    fullSection: `${level} ${title}\n\n${content}`,
  }));

/**
 * Genera un documento markdown completo con 2-5 secciones,
 * cada una con ≤ 800 tokens.
 */
const markdownDocumentArb = fc
  .array(markdownSectionArb, { minLength: 2, maxLength: 5 })
  .map((sections) => ({
    sections,
    fullDocument: sections.map((s) => s.fullSection).join('\n\n'),
  }));

// ─── Arbitraries para Property 4 ─────────────────────────────────────────────

/**
 * Genera una oración con entre 5 y 20 palabras.
 */
const sentenceArb = fc
  .array(wordArb, { minLength: 5, maxLength: 20 })
  .map((words) => words.join(' ') + '.');

/**
 * Genera un párrafo con entre 2 y 8 oraciones.
 */
const multiSentenceParagraphArb = fc
  .array(sentenceArb, { minLength: 2, maxLength: 8 })
  .map((sentences) => sentences.join(' '));

/**
 * Genera texto multi-párrafo con ≥ 50 tokens.
 * Usa entre 4 y 12 párrafos separados por \n\n para garantizar
 * suficiente contenido.
 */
const multiParagraphTextArb = fc
  .array(multiSentenceParagraphArb, { minLength: 4, maxLength: 12 })
  .map((paragraphs) => paragraphs.join('\n\n'))
  .filter((text) => {
    const words = text.split(/\s+/).filter(Boolean).length;
    const tokens = Math.ceil(words / 0.75);
    return tokens >= 50;
  });

// ─── Helpers para Property 4 ─────────────────────────────────────────────────

/**
 * Extrae todas las oraciones de un texto.
 * Una oración se define como texto que termina en . ! o ?
 */
function extractSentences(text: string): string[] {
  const sentenceRegex = /[^.!?]*[.!?]/g;
  const matches = text.match(sentenceRegex);
  if (!matches) return [text.trim()].filter(Boolean);
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Normaliza texto eliminando whitespace extra para comparación.
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ─── Property 4: Chunking preserves all content (round-trip) ─────────────────

describe('Property 4: Chunking preserves all content (round-trip)', () => {
  /**
   * **Validates: Requirements 4.9**
   *
   * For any valid text with total tokens ≥ 50, applying the chunking algorithm
   * and then concatenating all chunk contents (removing overlapping regions)
   * SHALL produce a text that contains every sentence from the original
   * without loss of information.
   */

  it('every sentence from the original text appears in at least one chunk (plain text)', () => {
    fc.assert(
      fc.property(multiParagraphTextArb, (text) => {
        const chunks = service.chunkPlainText(text, 'test-source');

        // Debe producir al menos un chunk
        expect(chunks.length).toBeGreaterThan(0);

        // Concatenar todo el contenido de los chunks
        const allChunkContent = chunks.map((c) => c.content).join(' ');
        const normalizedChunkContent = normalizeWhitespace(allChunkContent);

        // Extraer oraciones del texto original
        const originalSentences = extractSentences(text);

        // Cada oración del original debe aparecer en al menos un chunk
        for (const sentence of originalSentences) {
          const normalizedSentence = normalizeWhitespace(sentence);
          expect(normalizedChunkContent).toContain(normalizedSentence);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('every sentence from the original text appears in at least one chunk (markdown)', () => {
    fc.assert(
      fc.property(multiParagraphTextArb, (text) => {
        // Agregar headers markdown para simular formato MD
        const paragraphs = text.split('\n\n');
        const mdText = paragraphs
          .map((p, i) => (i % 3 === 0 ? `## Sección ${i}\n\n${p}` : p))
          .join('\n\n');

        const chunks = service.chunkMarkdown(mdText, 'test-source');

        // Debe producir al menos un chunk
        expect(chunks.length).toBeGreaterThan(0);

        // Concatenar todo el contenido de los chunks
        const allChunkContent = chunks.map((c) => c.content).join(' ');
        const normalizedChunkContent = normalizeWhitespace(allChunkContent);

        // Extraer oraciones del texto original (sin los headers)
        const contentWithoutHeaders = mdText.replace(/^#{1,3}\s+.+$/gm, '');
        const originalSentences = extractSentences(contentWithoutHeaders);

        // Cada oración del original debe aparecer en al menos un chunk
        for (const sentence of originalSentences) {
          const normalizedSentence = normalizeWhitespace(sentence);
          if (normalizedSentence.length > 0) {
            expect(normalizedChunkContent).toContain(normalizedSentence);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('no words from the original are lost after chunking (plain text)', () => {
    fc.assert(
      fc.property(multiParagraphTextArb, (text) => {
        const chunks = service.chunkPlainText(text, 'test-source');

        // Extraer todas las palabras del texto original
        const originalWords = text.split(/\s+/).filter(Boolean);

        // Concatenar contenido de todos los chunks
        const allChunkContent = chunks.map((c) => c.content).join(' ');
        const chunkWords = new Set(allChunkContent.split(/\s+/).filter(Boolean));

        // Cada palabra del original debe estar presente en algún chunk
        for (const word of originalWords) {
          expect(chunkWords.has(word)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Generadores para Property 6 ────────────────────────────────────────────

/**
 * Genera una oración con un número controlado de palabras.
 * Cada oración termina en punto.
 */
function arbitrarySentence(minWords: number, maxWords: number): fc.Arbitrary<string> {
  return fc
    .array(
      fc.constantFrom(
        'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur',
        'adipiscing', 'elit', 'sed', 'tempor', 'incididunt', 'labore',
        'dolore', 'magna', 'aliqua', 'veniam', 'quis', 'nostrud',
        'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip',
        'commodo', 'consequat', 'duis', 'aute', 'irure', 'voluptate',
        'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur',
        'excepteur', 'sint', 'occaecat', 'cupidatat', 'proident',
        'sunt', 'culpa', 'officia', 'deserunt', 'mollit', 'anim',
      ),
      { minLength: minWords, maxLength: maxWords },
    )
    .map((words) => words.join(' ') + '.');
}

/**
 * Genera un párrafo con ≤ 800 tokens compuesto por 1-5 oraciones.
 * Filtra para asegurar que el resultado tiene ≤ 800 tokens.
 */
function arbitrarySmallParagraph(): fc.Arbitrary<string> {
  return fc
    .array(arbitrarySentence(5, 60), { minLength: 1, maxLength: 5 })
    .map((sentences) => sentences.join(' '))
    .filter((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean).length;
      const tokens = Math.ceil(words / 0.75);
      return tokens <= 800 && tokens >= 5;
    });
}

/**
 * Genera texto compuesto por párrafos donde cada párrafo tiene ≤ 800 tokens,
 * separados por \n\n.
 */
function arbitraryTextWithSmallParagraphs(): fc.Arbitrary<string> {
  return fc
    .array(arbitrarySmallParagraph(), { minLength: 2, maxLength: 8 })
    .map((paragraphs) => paragraphs.join('\n\n'));
}

/**
 * Genera un párrafo largo (> 800 tokens) compuesto por muchas oraciones.
 * Cada oración termina en punto.
 * Se genera con suficientes oraciones para garantizar > 1200 tokens,
 * asegurando que el servicio lo divida en múltiples chunks.
 */
function arbitraryLargeParagraph(): fc.Arbitrary<string> {
  return fc
    .array(arbitrarySentence(8, 20), { minLength: 40, maxLength: 80 })
    .map((sentences) => sentences.join(' '))
    .filter((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean).length;
      const tokens = Math.ceil(words / 0.75);
      return tokens > 1200;
    });
}

// ─── Property 6: Paragraph boundary integrity ────────────────────────────────

describe('Property 6: Paragraph boundary integrity', () => {
  /**
   * **Validates: Requirements 4.2, 4.6**
   *
   * For any text composed of paragraphs where each paragraph has ≤ 800 tokens,
   * no chunk SHALL split a paragraph in the middle.
   * If a single paragraph exceeds 800 tokens, it SHALL be split only at
   * sentence boundaries.
   */

  it('no debe cortar párrafos ≤ 800 tokens a la mitad', () => {
    fc.assert(
      fc.property(arbitraryTextWithSmallParagraphs(), (text) => {
        const chunks = service.chunkPlainText(text, 'test-source');

        // Obtener los párrafos originales
        const originalParagraphs = text
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        // Para cada párrafo original, verificar que aparece completo
        // dentro de al menos un chunk. El overlap puede duplicar contenido
        // entre chunks, pero el párrafo completo debe estar en al menos uno.
        for (const paragraph of originalParagraphs) {
          const paragraphFoundComplete = chunks.some((chunk) =>
            chunk.content.includes(paragraph),
          );

          expect(
            paragraphFoundComplete,
            `El párrafo "${paragraph.substring(0, 50)}..." debería aparecer completo en al menos un chunk`,
          ).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('párrafos > 800 tokens se cortan solo en límites de oración', () => {
    fc.assert(
      fc.property(arbitraryLargeParagraph(), (largeParagraph) => {
        const chunks = service.chunkPlainText(largeParagraph, 'test-source');

        // Debe generar al menos un chunk
        expect(chunks.length).toBeGreaterThanOrEqual(1);

        // Si se generaron múltiples chunks (el párrafo fue efectivamente dividido),
        // cada chunk intermedio debe terminar en un límite de oración.
        // Nota: cuando el párrafo es apenas > 800 tokens, el servicio puede
        // reagrupar las oraciones en un solo chunk tras la subdivisión, lo cual es válido.
        if (chunks.length > 1) {
          for (let i = 0; i < chunks.length - 1; i++) {
            const content = chunks[i].content.trim();
            const lastChar = content[content.length - 1];

            expect(
              lastChar === '.' || lastChar === '!' || lastChar === '?',
              `El chunk ${i} debería terminar en límite de oración (., !, ?), pero termina en "${lastChar}". Contenido final: "...${content.slice(-30)}"`,
            ).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: Markdown section integrity ──────────────────────────────────

describe('Property 7: Markdown section integrity', () => {
  /**
   * **Validates: Requirements 4.3, 4.4**
   */

  it('secciones completas (≤ 800 tokens) se mantienen como un solo chunk sin subdivisión', () => {
    fc.assert(
      fc.property(markdownDocumentArb, ({ sections, fullDocument }) => {
        const chunks = service.chunkMarkdown(fullDocument, 'test-source');

        // Para cada sección que cabe en ≤ 800 tokens,
        // su contenido debe aparecer completo en un solo chunk
        for (const section of sections) {
          const sectionTokens = service.countTokens(section.fullSection);

          // Solo verificamos secciones que caben en el target (≤ 800 tokens)
          if (sectionTokens <= 800 && sectionTokens >= 50) {
            // El contenido de la sección debe estar contenido en algún chunk
            const chunkContainingSection = chunks.find(
              (chunk) =>
                chunk.content.includes(section.content) &&
                chunk.content.includes(section.header),
            );

            expect(
              chunkContainingSection,
              `La sección "${section.header}" (${sectionTokens} tokens) debería estar completa en un solo chunk`,
            ).toBeDefined();
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('headers h1-h3 actúan como separadores naturales entre chunks', () => {
    fc.assert(
      fc.property(markdownDocumentArb, ({ sections, fullDocument }) => {
        const chunks = service.chunkMarkdown(fullDocument, 'test-source');

        // Si hay múltiples secciones con suficientes tokens (≥ minTokens),
        // los headers deben actuar como límites de chunk.
        // Verificamos que el contenido de secciones distintas no se mezcla
        // en un mismo chunk (excepto por overlap o fusión de secciones pequeñas).
        const validSections = sections.filter(
          (s) => service.countTokens(s.fullSection) >= 50,
        );

        if (validSections.length >= 2) {
          // Para cada par de secciones válidas consecutivas,
          // verificar que no están en el mismo chunk (sin contar overlap)
          for (let i = 0; i < validSections.length - 1; i++) {
            const currentSection = validSections[i];
            const nextSection = validSections[i + 1];

            // Buscar el chunk que contiene el contenido principal de cada sección
            const chunkWithCurrent = chunks.find((chunk) =>
              chunk.content.includes(currentSection.content),
            );
            const chunkWithNext = chunks.find((chunk) =>
              chunk.content.includes(nextSection.content),
            );

            // Si ambas secciones son suficientemente grandes y están en chunks distintos,
            // los headers actuaron como separadores
            if (chunkWithCurrent && chunkWithNext) {
              // Verificar que al menos el header de la siguiente sección
              // no está mezclado con el contenido completo de la sección anterior
              // (el overlap puede incluir texto del chunk anterior, pero no el header del siguiente)
              if (chunkWithCurrent !== chunkWithNext) {
                // Los headers separaron correctamente las secciones
                expect(chunkWithCurrent.content).not.toContain(
                  nextSection.content,
                );
              }
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('cada chunk de markdown tiene metadata de sección asignada', () => {
    fc.assert(
      fc.property(markdownDocumentArb, ({ fullDocument }) => {
        const chunks = service.chunkMarkdown(fullDocument, 'test-source');

        // Todos los chunks deben tener sourceId correcto
        for (const chunk of chunks) {
          expect(chunk.metadata.sourceId).toBe('test-source');
        }

        // Los chunks que contienen headers deben tener metadata.section definida
        for (const chunk of chunks) {
          if (chunk.content.match(/^#{1,3}\s+.+$/m)) {
            expect(chunk.metadata.section).toBeDefined();
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Generadores para Property 8 ────────────────────────────────────────────

/**
 * Genera texto plano arbitrario con múltiples párrafos separados por \n\n.
 * Cada párrafo tiene entre 5 y 100 palabras.
 */
const arbitraryPlainText = fc
  .array(
    fc.array(fc.stringMatching(/^[a-záéíóúñ]{2,12}$/), { minLength: 5, maxLength: 100 })
      .map((words) => words.join(' ')),
    { minLength: 1, maxLength: 15 },
  )
  .map((paragraphs) => paragraphs.join('\n\n'));

/**
 * Genera texto Markdown arbitrario con headers h1-h3 y contenido bajo cada sección.
 */
const arbitraryMarkdownForPositions = fc
  .array(
    fc.tuple(
      fc.constantFrom('#', '##', '###'),
      fc.stringMatching(/^[A-Za-záéíóúñ]{3,15}$/),
      fc.array(fc.stringMatching(/^[a-záéíóúñ]{2,12}$/), { minLength: 5, maxLength: 80 })
        .map((words) => words.join(' ')),
    ),
    { minLength: 1, maxLength: 10 },
  )
  .map((sections) =>
    sections
      .map(([level, title, content]) => `${level} ${title}\n\n${content}`)
      .join('\n\n'),
  );

/** Genera sourceId arbitrario no vacío */
const arbitrarySourceId = fc.stringMatching(/^[a-z0-9\-]{3,36}$/);

// ─── Property 8: Sequential chunk positions ──────────────────────────────────

describe('Property 8: Sequential chunk positions', () => {
  /**
   * **Validates: Requirements 4.7**
   *
   * For any chunking result with N chunks, the position values SHALL form
   * a strictly increasing sequence starting at 0: [0, 1, 2, ..., N-1].
   * Each chunk SHALL reference the correct sourceId.
   */

  it('chunkPlainText: posiciones forman secuencia [0, 1, ..., N-1] para cualquier texto', () => {
    fc.assert(
      fc.property(arbitraryPlainText, arbitrarySourceId, (text, sourceId) => {
        const chunks = service.chunkPlainText(text, sourceId);

        if (chunks.length === 0) return; // texto vacío no genera chunks

        // Las posiciones deben ser exactamente [0, 1, 2, ..., N-1]
        const positions = chunks.map((c) => c.position);
        const expected = Array.from({ length: chunks.length }, (_, i) => i);
        expect(positions).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('chunkPlainText: cada chunk referencia el sourceId correcto', () => {
    fc.assert(
      fc.property(arbitraryPlainText, arbitrarySourceId, (text, sourceId) => {
        const chunks = service.chunkPlainText(text, sourceId);

        for (const chunk of chunks) {
          expect(chunk.metadata.sourceId).toBe(sourceId);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('chunkMarkdown: posiciones forman secuencia [0, 1, ..., N-1] para cualquier markdown', () => {
    fc.assert(
      fc.property(arbitraryMarkdownForPositions, arbitrarySourceId, (text, sourceId) => {
        const chunks = service.chunkMarkdown(text, sourceId);

        if (chunks.length === 0) return; // texto vacío no genera chunks

        // Las posiciones deben ser exactamente [0, 1, 2, ..., N-1]
        const positions = chunks.map((c) => c.position);
        const expected = Array.from({ length: chunks.length }, (_, i) => i);
        expect(positions).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('chunkMarkdown: cada chunk referencia el sourceId correcto', () => {
    fc.assert(
      fc.property(arbitraryMarkdownForPositions, arbitrarySourceId, (text, sourceId) => {
        const chunks = service.chunkMarkdown(text, sourceId);

        for (const chunk of chunks) {
          expect(chunk.metadata.sourceId).toBe(sourceId);
        }
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Generadores para Property 5 ────────────────────────────────────────────

/**
 * Genera texto con un número variable de palabras agrupadas en párrafos.
 * Asegura que el texto total tenga ≥ 50 tokens.
 */
const textWithAtLeast50Tokens = fc
  .array(wordArb, { minLength: 45, maxLength: 600 })
  .chain((words) =>
    fc.integer({ min: 5, max: Math.max(5, Math.floor(words.length / 5)) }).map((numParagraphs) => {
      const paragraphs: string[] = [];
      const wordsPerParagraph = Math.floor(words.length / numParagraphs);
      for (let i = 0; i < numParagraphs; i++) {
        const start = i * wordsPerParagraph;
        const end = i === numParagraphs - 1 ? words.length : start + wordsPerParagraph;
        paragraphs.push(words.slice(start, end).join(' '));
      }
      return paragraphs.join('\n\n');
    }),
  );

/**
 * Genera texto corto con menos de 50 tokens (< 38 palabras).
 */
const textWithLessThan50Tokens = fc
  .array(wordArb, { minLength: 1, maxLength: 25 })
  .map((words) => words.join(' '));

/**
 * Genera markdown con headers y contenido de tamaño variable.
 * Asegura que el texto total tenga ≥ 50 tokens.
 */
const markdownWithAtLeast50Tokens = fc
  .array(
    fc.tuple(
      headerLevelArb,
      headerTitleArb,
      fc.array(wordArb, { minLength: 15, maxLength: 120 }),
    ),
    { minLength: 1, maxLength: 6 },
  )
  .map((sections) =>
    sections
      .map(([level, title, words]) => `${level} ${title}\n\n${words.join(' ')}`)
      .join('\n\n'),
  );

// ─── Property 5: Chunk size bounds ──────────────────────────────────────────

describe('Property 5: Chunk size bounds', () => {
  /**
   * **Validates: Requirements 4.1, 4.5**
   *
   * For any valid text with total tokens ≥ 50, ALL resulting chunks SHALL have
   * a token count between 50 (minimum) and 900 (target + tolerance) tokens.
   * Exception: if the entire input has < 50 tokens, a single chunk is produced.
   */

  const MIN_TOKENS = 50;
  const MAX_TOKENS = 900;

  it('chunkPlainText: todos los chunks tienen entre 50 y 900 tokens cuando input ≥ 50 tokens', () => {
    fc.assert(
      fc.property(textWithAtLeast50Tokens, (text) => {
        const totalTokens = service.countTokens(text);

        // Solo verificar si el input tiene ≥ 50 tokens
        if (totalTokens < MIN_TOKENS) return;

        const chunks = service.chunkPlainText(text, 'test-source');

        // Debe producir al menos un chunk
        expect(chunks.length).toBeGreaterThan(0);

        for (const chunk of chunks) {
          expect(chunk.tokenCount).toBeGreaterThanOrEqual(MIN_TOKENS);
          expect(chunk.tokenCount).toBeLessThanOrEqual(MAX_TOKENS);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('chunkMarkdown: todos los chunks tienen entre 50 y 900 tokens cuando input ≥ 50 tokens', () => {
    fc.assert(
      fc.property(markdownWithAtLeast50Tokens, (text) => {
        const totalTokens = service.countTokens(text);

        // Solo verificar si el input tiene ≥ 50 tokens
        if (totalTokens < MIN_TOKENS) return;

        const chunks = service.chunkMarkdown(text, 'test-source');

        // Debe producir al menos un chunk
        expect(chunks.length).toBeGreaterThan(0);

        for (const chunk of chunks) {
          expect(chunk.tokenCount).toBeGreaterThanOrEqual(MIN_TOKENS);
          expect(chunk.tokenCount).toBeLessThanOrEqual(MAX_TOKENS);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('chunkPlainText: input con < 50 tokens produce un solo chunk sin restricción de mínimo', () => {
    fc.assert(
      fc.property(textWithLessThan50Tokens, (text) => {
        const totalTokens = service.countTokens(text);

        // Solo verificar si el input tiene < 50 tokens y no está vacío
        if (totalTokens >= MIN_TOKENS || totalTokens === 0) return;

        const chunks = service.chunkPlainText(text, 'test-source');

        // Debe producir exactamente un chunk
        expect(chunks.length).toBe(1);
        // El chunk puede tener menos de 50 tokens (excepción)
        expect(chunks[0].tokenCount).toBeLessThan(MIN_TOKENS);
        // Pero nunca debe exceder el máximo
        expect(chunks[0].tokenCount).toBeLessThanOrEqual(MAX_TOKENS);
      }),
      { numRuns: 100 },
    );
  });

  it('chunkMarkdown: input con < 50 tokens produce un solo chunk sin restricción de mínimo', () => {
    fc.assert(
      fc.property(textWithLessThan50Tokens, (text) => {
        const totalTokens = service.countTokens(text);

        // Solo verificar si el input tiene < 50 tokens y no está vacío
        if (totalTokens >= MIN_TOKENS || totalTokens === 0) return;

        const chunks = service.chunkMarkdown(text, 'test-source');

        // Debe producir exactamente un chunk
        expect(chunks.length).toBe(1);
        // El chunk puede tener menos de 50 tokens (excepción)
        expect(chunks[0].tokenCount).toBeLessThan(MIN_TOKENS);
        // Pero nunca debe exceder el máximo
        expect(chunks[0].tokenCount).toBeLessThanOrEqual(MAX_TOKENS);
      }),
      { numRuns: 100 },
    );
  });
});
