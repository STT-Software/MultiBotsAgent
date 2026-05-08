import { Inject, Injectable, Logger } from '@nestjs/common';

import { RAG_LLM_PROVIDER } from '../constants/injection-tokens';

import type { LlmPrompt, LlmProvider, SearchResult } from '@multibotagents/types';

/**
 * Servicio de validación post-retrieval (re-ranking).
 * Invoca al LLM para evaluar relevancia de fragmentos recuperados
 * contra la pregunta del usuario, retornando solo los validados.
 *
 * Valida: Requisitos 4.1, 4.2, 4.3
 */
@Injectable()
export class ReRankingService {
  private readonly logger = new Logger(ReRankingService.name);

  constructor(
    @Inject(RAG_LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  /**
   * Valida relevancia de fragmentos usando el LLM.
   * Envía un prompt estructurado pidiendo al LLM que evalúe cada fragmento
   * y retorne los índices de los que realmente responden la pregunta.
   *
   * Si el parsing falla o el LLM no responde correctamente,
   * aplica graceful degradation retornando todos los fragmentos.
   */
  async validate(fragments: SearchResult[], userMessage: string): Promise<SearchResult[]> {
    if (fragments.length === 0) {
      return [];
    }

    try {
      const prompt = this.buildReRankingPrompt(fragments, userMessage);

      this.logger.debug('Invoking LLM for re-ranking', {
        fragmentCount: fragments.length,
        userMessageLength: userMessage.length,
      });

      const response = await this.llmProvider.generate(prompt);

      const validatedIndices = this.parseValidatedIndices(
        response.content,
        fragments.length,
      );

      this.logger.debug('Re-ranking completed', {
        totalFragments: fragments.length,
        validatedCount: validatedIndices.length,
        validatedIndices,
      });

      return fragments.filter((_, index) => validatedIndices.includes(index));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Re-ranking failed, returning all fragments as fallback', {
        error: errorMessage,
        fragmentCount: fragments.length,
      });

      // Graceful degradation: if re-ranking fails, return all fragments
      return fragments;
    }
  }

  /**
   * Construye el prompt de re-ranking para el LLM.
   * Presenta la pregunta del usuario y cada fragmento numerado,
   * pidiendo al LLM que retorne un JSON array con los índices relevantes.
   */
  private buildReRankingPrompt(fragments: SearchResult[], userMessage: string): LlmPrompt {
    const fragmentsList = fragments
      .map((fragment, index) => `[${index}] ${fragment.content}`)
      .join('\n\n');

    const systemPrompt = [
      'You are a relevance evaluation assistant.',
      'Your task is to determine which text fragments are relevant to answering the user question.',
      'Evaluate each fragment and determine if it contains information that helps answer the question.',
      '',
      'Rules:',
      '- A fragment is relevant if it contains information directly related to the question.',
      '- A fragment is NOT relevant if it discusses unrelated topics, even if it has similar keywords.',
      '- Be strict: only mark fragments that genuinely help answer the question.',
      '',
      'You MUST respond with ONLY a JSON array of the indices (zero-based) of relevant fragments.',
      'Example response: [0, 2, 4]',
      'If no fragments are relevant, respond with: []',
      'Do NOT include any explanation or text outside the JSON array.',
    ].join('\n');

    const context = [
      '--- FRAGMENTS TO EVALUATE ---',
      fragmentsList,
    ].join('\n');

    return {
      systemPrompt,
      context,
      history: [],
      userMessage: `Question: ${userMessage}`,
      maxResponseLength: 200,
    };
  }

  /**
   * Parsea la respuesta del LLM para extraer los índices validados.
   * Busca un JSON array en la respuesta y filtra índices válidos.
   * Si el parsing falla, retorna todos los índices (graceful degradation).
   */
  private parseValidatedIndices(content: string, fragmentCount: number): number[] {
    try {
      // Try to extract a JSON array from the response
      const jsonMatch = content.match(/\[[\d\s,]*\]/);

      if (!jsonMatch) {
        this.logger.warn('Could not find JSON array in LLM re-ranking response', {
          responseContent: content.substring(0, 200),
        });
        return this.allIndices(fragmentCount);
      }

      const parsed: unknown = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        this.logger.warn('Parsed re-ranking response is not an array', {
          parsed,
        });
        return this.allIndices(fragmentCount);
      }

      // Filter to valid indices only
      const validIndices = parsed
        .filter((item): item is number => typeof item === 'number')
        .filter((index) => Number.isInteger(index) && index >= 0 && index < fragmentCount);

      return validIndices;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to parse re-ranking LLM response', {
        error: errorMessage,
        responseContent: content.substring(0, 200),
      });
      return this.allIndices(fragmentCount);
    }
  }

  /**
   * Returns all indices from 0 to count-1 (fallback when parsing fails).
   */
  private allIndices(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }
}
