/**
 * Reglas puras de escalamiento para el Motor de Agente RAG.
 * Funciones sin dependencias externas que determinan cuándo escalar a un humano.
 *
 * Valida: Requisitos 12.1, 12.2, 12.3
 */

import { LlmResponse } from "@multibotagents/types";

/**
 * Determina si se debe escalar por cantidad de intentos fallidos consecutivos.
 * Retorna true cuando failedCount >= threshold.
 *
 * Valida: Requisito 12.1
 */
export function shouldEscalateByAttempts(
  failedCount: number,
  threshold: number,
): boolean {
  return failedCount >= threshold;
}

/**
 * Determina si se debe escalar por incertidumbre del LLM.
 * Retorna true cuando la respuesta tiene el campo uncertaintyIndicator en true.
 *
 * Valida: Requisito 12.2
 */
export function shouldEscalateByUncertainty(llmResponse: LlmResponse): boolean {
  return llmResponse.uncertaintyIndicator === true;
}

/**
 * Detecta si el mensaje del usuario contiene una solicitud explícita de escalamiento.
 * Compara el mensaje (case-insensitive) contra los patrones proporcionados.
 * Retorna true si el mensaje incluye al menos uno de los patrones.
 *
 * Valida: Requisito 12.3
 */
export function detectUserEscalationRequest(
  userMessage: string,
  patterns: string[],
): boolean {
  const lowerMessage = userMessage.toLowerCase();
  return patterns.some((pattern) => lowerMessage.includes(pattern.toLowerCase()));
}
