/**
 * Interfaces de entrada/salida del Motor de Agente RAG.
 * Definen la estructura de los datos que entran y salen del flujo RAG.
 *
 * Valida: Requisitos 1.1, 10.1, 11.1, 11.2, 11.3
 */

import { EscalationReason, ResponseType } from "../enums/rag-engine.enums";

/**
 * Entrada al proceso RAG.
 * Contiene la información necesaria para procesar una consulta del usuario.
 */
export interface RagProcessInput {
  agentId: string;
  conversationId: string;
  userMessage: string;
  timestamp: Date;
  channelId?: string;
  messageType?: "text" | "audio" | "image";
  mediaId?: string;
  mimeType?: string;
  fileUrl?: string;
}

/**
 * Salida del proceso RAG.
 * Contiene la respuesta generada y metadatos de escalamiento.
 */
export interface RagProcessOutput {
  conversationId: string;
  messages: ResponseMessage[];
  escalated: boolean;
  escalationReason?: EscalationReason;
}

/**
 * Mensaje individual dentro de la respuesta RAG.
 * Soporta múltiples tipos de contenido (texto, imagen, documento).
 */
export interface ResponseMessage {
  type: ResponseType;
  content: string;
}
