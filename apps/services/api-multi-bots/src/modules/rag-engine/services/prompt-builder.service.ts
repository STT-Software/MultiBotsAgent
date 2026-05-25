import { Injectable } from '@nestjs/common';
import {
  AgentConfig,
  HistoryMessage,
  LlmPrompt,
  SearchResult,
} from '@multibotagents/types';
import { buildFullPrompt, truncateHistory } from '@multibotagents/core';

/**
 * Límite por defecto de tokens para el historial conversacional.
 * Se usa cuando la configuración del agente no especifica un límite explícito.
 */
const DEFAULT_MAX_HISTORY_TOKENS = 2000;

/**
 * Servicio de construcción del prompt final.
 * Delega a funciones puras de packages/core para la lógica de construcción
 * e integra con token management para truncamiento de historial.
 *
 * Valida: Requisitos 5.1, 5.2, 5.3, 5.4
 */
@Injectable()
export class PromptBuilderService {
  /**
   * Construye el prompt completo para enviar al LLM.
   *
   * 1. Trunca el historial conversacional para respetar el límite de tokens.
   * 2. Delega a `buildFullPrompt` de packages/core para la construcción del prompt.
   * 3. Retorna el objeto LlmPrompt estructurado.
   *
   * @param params - Parámetros de construcción del prompt
   * @param params.config - Configuración completa del agente
   * @param params.fragments - Fragmentos de búsqueda validados por re-ranking
   * @param params.history - Historial conversacional reciente
   * @param params.userMessage - Mensaje actual del usuario
   * @returns Objeto LlmPrompt listo para enviar al LLM
   */
  buildPrompt(params: {
    config: AgentConfig;
    fragments: SearchResult[];
    history: HistoryMessage[];
    userMessage: string;
  }): LlmPrompt {
    const { config, fragments, history, userMessage } = params;

    // 1. Truncar historial basado en el límite de tokens
    const truncatedHistory = truncateHistory(history, DEFAULT_MAX_HISTORY_TOKENS);

    // 2. Construir el prompt completo usando lógica pura de core
    return buildFullPrompt({
      config,
      fragments,
      history: truncatedHistory,
      userMessage,
    });
  }
}
