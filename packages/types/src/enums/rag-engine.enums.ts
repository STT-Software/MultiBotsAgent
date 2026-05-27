/**
 * Enums del Motor de Agente RAG.
 * Definen los conjuntos de valores constantes usados en el flujo RAG.
 */

/**
 * Razones por las cuales una consulta puede ser escalada a un humano.
 * Valida: Requisitos 10.6, 11.2
 */
export const EscalationReason = {
  LOW_RELEVANCE: "low_relevance",
  USER_REQUEST: "user_request",
  FAILED_ATTEMPTS: "failed_attempts",
  LLM_UNCERTAINTY: "llm_uncertainty",
  LLM_UNAVAILABLE: "llm_unavailable",
} as const;

export type EscalationReason =
  (typeof EscalationReason)[keyof typeof EscalationReason];

/**
 * Roles posibles en un mensaje de conversación.
 * Valida: Requisitos 10.6
 */
export const MessageRole = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

/**
 * Tipos de contenido soportados en un ResponseMessage.
 * Valida: Requisitos 11.2
 */
export const ResponseType = {
  TEXT: "text",
  IMAGE: "image",
  DOCUMENT: "document",
} as const;

export type ResponseType = (typeof ResponseType)[keyof typeof ResponseType];

/**
 * Estados posibles de una conversación en el flujo de escalamiento.
 * Valida: Requisitos 12.4, 13.1, 13.2
 */
export type ConversationStatus = 'active' | 'escalated' | 'paused';
