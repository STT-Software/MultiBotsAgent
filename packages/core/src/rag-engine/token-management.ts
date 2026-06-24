import { HistoryMessage } from '@multibotagents/types';

/**
 * Estima el número de tokens de un texto.
 * Usa la heurística de ~1 token por cada 4 caracteres (aproximación común para inglés/español).
 *
 * @param text - Texto a estimar
 * @returns Número estimado de tokens
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Trunca el historial conversacional para respetar el límite de tokens.
 * Elimina mensajes más antiguos primero, preservando los más recientes.
 *
 * @param history - Array de mensajes del historial (ordenados cronológicamente)
 * @param maxTokens - Límite máximo de tokens permitidos
 * @returns Array truncado con los mensajes más recientes que caben en el límite
 */
export function truncateHistory(history: HistoryMessage[], maxTokens: number): HistoryMessage[] {
  const totalTokens = history.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);

  if (totalTokens <= maxTokens) {
    return history;
  }

  let tokensToRemove = totalTokens - maxTokens;
  let startIndex = 0;

  for (let i = 0; i < history.length; i++) {
    const msgTokens = estimateTokens(history[i].content);
    if (tokensToRemove <= 0) {
      break;
    }
    tokensToRemove -= msgTokens;
    startIndex = i + 1;
  }

  return history.slice(startIndex);
}
