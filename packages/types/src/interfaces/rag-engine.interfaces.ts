/**
 * Interfaces de proveedores y servicios del Motor de Agente RAG.
 * Definen contratos agnósticos al proveedor para LLM, búsqueda vectorial y memoria.
 *
 * Valida: Requisitos 10.2, 10.3, 10.4, 10.6
 */

import { MessageRole } from "../enums/rag-engine.enums";
import { ChatMessage } from "../memory/memory.types";

// ─── LLM Provider ────────────────────────────────────────────────────────────

/**
 * Interface agnóstica para invocación de modelos de lenguaje.
 * La implementación concreta usa AWS Bedrock vía LangChain.
 *
 * Valida: Requisito 10.2
 */
export interface LlmProvider {
  generate(prompt: LlmPrompt): Promise<LlmResponse>;
  getModel?(hasImage?: boolean): any;
}

/**
 * Estructura del prompt completo enviado al LLM.
 */
export interface LlmPrompt {
  systemPrompt: string;
  context: string;
  history: HistoryMessage[];
  userMessage: string;
  maxResponseLength: number;
  image?: {
    base64: string;
    mimeType: string;
  };
  language?: string;
}

/**
 * Respuesta del LLM con metadatos de uso.
 */
export interface LlmResponse {
  content: string;
  tokensUsed: number;
  finishReason: "stop" | "length" | "error";
}

// ─── Vector Search Service ───────────────────────────────────────────────────

/**
 * Interface agnóstica para búsqueda semántica vectorial.
 * La implementación concreta usa MongoDB Atlas Vector Search.
 *
 * Valida: Requisito 10.3
 */
export interface VectorSearchService {
  search(agentId: string, query: string, topK: number): Promise<SearchResult[]>;
}

/**
 * Resultado individual de búsqueda vectorial.
 */
export interface SearchResult {
  fragmentId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

// ─── Memory Service ──────────────────────────────────────────────────────────

/**
 * Interface agnóstica para gestión de memoria conversacional.
 * Provee acceso al historial y persistencia de mensajes.
 *
 * Valida: Requisito 10.4
 */
export interface MemoryService {
  getHistory(
    conversationId: string,
    windowSize: number,
  ): Promise<HistoryMessage[]>;
  saveMessage(
    conversationId: string,
    message: PersistMessage,
  ): Promise<void>;
  isNewSession(conversationId: string): Promise<boolean>;
  addMessage?(
    conversationId: string,
    message: ChatMessage,
  ): Promise<void>;
  refreshTTL?(
    conversationId: string,
  ): Promise<void>;
}

/**
 * Mensaje del historial conversacional.
 */
export interface HistoryMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  fileUrl?: string;
  messageType?: 'text' | 'image' | 'file';
}

/**
 * Mensaje a persistir en la memoria conversacional.
 */
export interface PersistMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  fileUrl?: string;
  messageType?: 'text' | 'image' | 'file';
}

// ─── Agent Config Provider ───────────────────────────────────────────────────

/**
 * Interface agnóstica para obtener la configuración de un agente.
 * La implementación concreta consulta la base de datos de agentes.
 *
 * Valida: Requisito 1.4
 */
export interface AgentConfigProvider {
  getConfig(agentId: string): Promise<AgentConfig>;
}

// ─── Agent Configuration ─────────────────────────────────────────────────────

/**
 * Configuración completa del agente RAG.
 * Incluye personalidad, umbrales, límites y mensajes predeterminados.
 *
 * Valida: Requisito 10.6
 */
export interface AgentConfig {
  agentId: string;
  companyId: string;
  tipo?: 'rag' | 'cotizador' | 'agendamiento';
  timezone?: string;
  personality: PersonalityConfig;
  relevanceThreshold: number;
  topK: number;
  maxResponseLength: number;
  memoryWindow: number;
  welcomeMessage?: string;
  failedAttemptsBeforeEscalation: number;
  noInfoMessage: string;
  errorMessage: string;
  language: string;
}

/**
 * Configuración de personalidad del agente.
 * Define nombre, tono, restricciones e instrucciones de comportamiento.
 */
export interface PersonalityConfig {
  name: string;
  tone: string;
  restrictions: string[];
  instructions: string;
}
