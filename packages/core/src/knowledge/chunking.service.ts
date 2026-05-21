/**
 * ChunkingService — Segmentación inteligente de texto para embeddings.
 *
 * Lógica pura sin dependencias de AWS, NestJS ni frameworks externos.
 * Reside en packages/core como lógica de negocio reutilizable.
 *
 * Valida: Requisitos 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** Configuración del servicio de chunking */
export interface ChunkingConfig {
  /** Tamaño objetivo de cada chunk en tokens (~800) */
  targetTokens: number;
  /** Tokens de overlap entre chunks consecutivos (~100) */
  overlapTokens: number;
  /** Tamaño mínimo de un chunk en tokens (50) */
  minTokens: number;
}

/** Fragmento de texto resultante del chunking */
export interface TextChunk {
  content: string;
  position: number;
  tokenCount: number;
  metadata: {
    sourceId: string;
    section?: string;
    page?: number;
  };
}

// ─── Configuración por defecto ───────────────────────────────────────────────

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  targetTokens: 800,
  overlapTokens: 100,
  minTokens: 50,
};

// ─── Servicio ────────────────────────────────────────────────────────────────

export class ChunkingService {
  private readonly config: ChunkingConfig;

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  }

  /**
   * Cuenta tokens de un texto usando la aproximación: palabras / 0.75
   * Valida: Requisito 4.1 (definición de token)
   */
  countTokens(text: string): number {
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.ceil(words / 0.75);
  }

  /**
   * Segmenta texto plano en chunks respetando límites de párrafo.
   * - Corta en límites de párrafo (\n\n)
   * - Si un párrafo excede targetTokens, subdivide en oraciones
   * - Fusiona fragmentos < minTokens con el adyacente
   * - Aplica overlap entre chunks consecutivos
   *
   * Valida: Requisitos 4.1, 4.2, 4.5, 4.6, 4.7, 4.9
   */
  chunkPlainText(text: string, sourceId: string): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // 1. Dividir en párrafos
    const paragraphs = this.splitIntoParagraphs(text);

    // 2. Subdividir párrafos grandes en oraciones
    const units = this.subdivideLargeParagraphs(paragraphs);

    // 3. Agrupar unidades en chunks respetando targetTokens
    const rawChunks = this.groupUnitsIntoChunks(units);

    // 4. Fusionar chunks pequeños (< minTokens)
    const mergedChunks = this.mergeSmallChunks(rawChunks);

    // 5. Aplicar overlap entre chunks consecutivos
    const overlappedChunks = this.applyOverlap(mergedChunks);

    // 6. Asignar metadata de posición y sourceId
    return this.assignMetadata(overlappedChunks, sourceId);
  }

  /**
   * Segmenta Markdown usando headers h1-h3 como separadores naturales.
   * - Primero divide por headers (niveles 1-3)
   * - Si una sección cabe en targetTokens, la mantiene como un solo chunk
   * - Si excede, aplica chunking por párrafos dentro de la sección
   * - Fusiona secciones pequeñas (< minTokens) con la adyacente
   * - Aplica overlap entre chunks consecutivos
   *
   * Valida: Requisitos 4.3, 4.4, 4.5, 4.7, 4.9
   */
  chunkMarkdown(text: string, sourceId: string): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // 1. Dividir por headers h1-h3
    const sections = this.splitByHeaders(text);

    // 2. Procesar cada sección
    const rawChunks: string[] = [];
    const sectionNames: (string | undefined)[] = [];

    for (const section of sections) {
      const sectionTokens = this.countTokens(section.content);

      if (sectionTokens <= this.config.targetTokens) {
        // La sección cabe completa en un chunk
        rawChunks.push(section.content);
        sectionNames.push(section.header);
      } else {
        // La sección es demasiado grande, aplicar chunking por párrafos
        const paragraphs = this.splitIntoParagraphs(section.content);
        const units = this.subdivideLargeParagraphs(paragraphs);
        const grouped = this.groupUnitsIntoChunks(units);

        for (const chunk of grouped) {
          rawChunks.push(chunk);
          sectionNames.push(section.header);
        }
      }
    }

    // 3. Fusionar chunks pequeños (< minTokens)
    const { chunks: mergedChunks, sections: mergedSections } =
      this.mergeSmallChunksWithSections(rawChunks, sectionNames);

    // 4. Aplicar overlap entre chunks consecutivos
    const overlappedChunks = this.applyOverlap(mergedChunks);

    // 5. Asignar metadata de posición, sourceId y sección
    return overlappedChunks.map((content, index) => ({
      content,
      position: index,
      tokenCount: this.countTokens(content),
      metadata: {
        sourceId,
        section: mergedSections[index],
      },
    }));
  }

  // ─── Métodos privados ────────────────────────────────────────────────────────

  /**
   * Divide texto en párrafos usando \n\n como separador.
   * Preserva el contenido de cada párrafo sin recortar.
   */
  private splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /**
   * Subdivide párrafos que exceden targetTokens en oraciones.
   * Los párrafos que caben se mantienen intactos.
   * Valida: Requisito 4.6
   */
  private subdivideLargeParagraphs(paragraphs: string[]): string[] {
    const units: string[] = [];

    for (const paragraph of paragraphs) {
      const tokens = this.countTokens(paragraph);

      if (tokens <= this.config.targetTokens) {
        units.push(paragraph);
      } else {
        // Subdividir en oraciones
        const sentences = this.splitIntoSentences(paragraph);
        units.push(...sentences);
      }
    }

    return units;
  }

  /**
   * Divide un párrafo en oraciones usando puntuación como delimitador.
   * Delimitadores: . ! ? seguidos de espacio o fin de texto.
   */
  private splitIntoSentences(text: string): string[] {
    // Dividir en oraciones respetando puntuación seguida de espacio o fin
    const sentenceRegex = /[^.!?]*[.!?](?:\s|$)|[^.!?]+$/g;
    const matches = text.match(sentenceRegex);

    if (!matches || matches.length === 0) {
      return [text];
    }

    return matches
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Agrupa unidades (párrafos u oraciones) en chunks respetando targetTokens.
   * Nunca corta una unidad a la mitad.
   * Valida: Requisito 4.2
   */
  private groupUnitsIntoChunks(units: string[]): string[] {
    if (units.length === 0) return [];

    const chunks: string[] = [];
    let currentChunk = '';
    let currentTokens = 0;

    for (const unit of units) {
      const unitTokens = this.countTokens(unit);

      if (currentChunk === '') {
        // Primer elemento del chunk
        currentChunk = unit;
        currentTokens = unitTokens;
      } else if (currentTokens + unitTokens <= this.config.targetTokens) {
        // Cabe en el chunk actual
        currentChunk += '\n\n' + unit;
        currentTokens += unitTokens;
      } else {
        // No cabe, cerrar chunk actual y empezar uno nuevo
        chunks.push(currentChunk);
        currentChunk = unit;
        currentTokens = unitTokens;
      }
    }

    // Agregar el último chunk
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Fusiona chunks con menos de minTokens con el chunk adyacente.
   * Valida: Requisito 4.5
   */
  private mergeSmallChunks(chunks: string[]): string[] {
    if (chunks.length <= 1) return chunks;

    const result: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const tokens = this.countTokens(chunk);

      if (tokens < this.config.minTokens && result.length > 0) {
        // Fusionar con el chunk anterior
        result[result.length - 1] += '\n\n' + chunk;
      } else if (
        tokens < this.config.minTokens &&
        result.length === 0 &&
        i + 1 < chunks.length
      ) {
        // Es el primer chunk y es pequeño, fusionar con el siguiente
        chunks[i + 1] = chunk + '\n\n' + chunks[i + 1];
      } else {
        result.push(chunk);
      }
    }

    return result;
  }

  /**
   * Fusiona chunks pequeños manteniendo la referencia de sección.
   * Versión para markdown que preserva metadata de sección.
   */
  private mergeSmallChunksWithSections(
    chunks: string[],
    sections: (string | undefined)[],
  ): { chunks: string[]; sections: (string | undefined)[] } {
    if (chunks.length <= 1) {
      return { chunks, sections };
    }

    const resultChunks: string[] = [];
    const resultSections: (string | undefined)[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const tokens = this.countTokens(chunk);

      if (tokens < this.config.minTokens && resultChunks.length > 0) {
        // Fusionar con el chunk anterior
        resultChunks[resultChunks.length - 1] += '\n\n' + chunk;
        // Mantener la sección del chunk anterior
      } else if (
        tokens < this.config.minTokens &&
        resultChunks.length === 0 &&
        i + 1 < chunks.length
      ) {
        // Es el primer chunk y es pequeño, fusionar con el siguiente
        chunks[i + 1] = chunk + '\n\n' + chunks[i + 1];
        // La sección del siguiente chunk se mantiene
      } else {
        resultChunks.push(chunk);
        resultSections.push(sections[i]);
      }
    }

    return { chunks: resultChunks, sections: resultSections };
  }

  /**
   * Aplica overlap de tokens entre chunks consecutivos.
   * El overlap se toma del final del chunk anterior y se prepone al siguiente.
   * Valida: Requisito 4.1 (overlap de 100 tokens)
   */
  private applyOverlap(chunks: string[]): string[] {
    if (chunks.length <= 1) return chunks;

    const result: string[] = [chunks[0]];

    for (let i = 1; i < chunks.length; i++) {
      const previousChunk = chunks[i - 1];
      const overlapText = this.extractOverlapFromEnd(previousChunk);

      if (overlapText) {
        result.push(overlapText + '\n\n' + chunks[i]);
      } else {
        result.push(chunks[i]);
      }
    }

    return result;
  }

  /**
   * Extrae aproximadamente overlapTokens tokens del final de un texto.
   * Corta en límites de palabra para no romper palabras.
   */
  private extractOverlapFromEnd(text: string): string {
    const words = text.split(/\s+/).filter(Boolean);
    // overlapTokens tokens ≈ overlapTokens * 0.75 palabras
    const overlapWords = Math.floor(this.config.overlapTokens * 0.75);

    if (words.length <= overlapWords) {
      return '';
    }

    return words.slice(-overlapWords).join(' ');
  }

  /**
   * Asigna metadata de posición secuencial y sourceId a cada chunk.
   * Valida: Requisito 4.7
   */
  private assignMetadata(chunks: string[], sourceId: string): TextChunk[] {
    return chunks.map((content, index) => ({
      content,
      position: index,
      tokenCount: this.countTokens(content),
      metadata: {
        sourceId,
      },
    }));
  }

  /**
   * Divide texto Markdown por headers h1-h3.
   * Cada sección incluye el contenido desde un header hasta el siguiente.
   * El contenido antes del primer header se trata como sección sin nombre.
   * Valida: Requisitos 4.3, 4.4
   */
  private splitByHeaders(
    text: string,
  ): Array<{ header?: string; content: string }> {
    const headerRegex = /^(#{1,3})\s+(.+)$/gm;
    const sections: Array<{ header?: string; content: string }> = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(text)) !== null) {
      // Contenido antes de este header
      if (match.index > lastIndex) {
        const contentBefore = text.slice(lastIndex, match.index).trim();
        if (contentBefore.length > 0) {
          if (sections.length === 0) {
            // Contenido antes del primer header
            sections.push({ content: contentBefore });
          } else {
            // Agregar contenido al último header
            sections[sections.length - 1].content += '\n\n' + contentBefore;
          }
        }
      }

      // Crear nueva sección con el header
      sections.push({
        header: match[2].trim(),
        content: match[0],
      });

      lastIndex = match.index + match[0].length;
    }

    // Contenido después del último header
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex).trim();
      if (remaining.length > 0) {
        if (sections.length > 0) {
          sections[sections.length - 1].content += '\n\n' + remaining;
        } else {
          // No hay headers, todo el texto es una sección
          sections.push({ content: remaining });
        }
      }
    }

    // Si no se encontraron secciones (texto vacío después de trim)
    if (sections.length === 0) {
      sections.push({ content: text.trim() });
    }

    return sections;
  }
}
