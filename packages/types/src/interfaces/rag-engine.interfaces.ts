/**
 * Interfaces de proveedores y servicios del Motor de Agente RAG.
 * Definen contratos agnósticos al proveedor para LLM, búsqueda vectorial y memoria.
 *
 * Valida: Requisitos 10.2, 10.3, 10.4, 10.6
 */

import { ConversationStatus, MessageRole } from "../enums/rag-engine.enums";

// ─── LLM Provider ────────────────────────────────────────────────────────────

/**
 * Interface agnóstica para invocación de modelos de lenguaje.
 * La implementación concreta usa AWS Bedrock vía LangChain.
 *
 * Valida: Requisito 10.2
 */
export interface LlmProvider {
  generate(prompt: LlmPrompt): Promise<LlmResponse>;
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
}

/**
 * Respuesta del LLM con metadatos de uso.
 */
export interface LlmResponse {
  content: string;
  tokensUsed: number;
  finishReason: "stop" | "length" | "error";
  uncertaintyIndicator?: boolean;
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
  getConversationStatus(conversationId: string): Promise<ConversationStatus>;
  updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<void>;
}

/**
 * Mensaje del historial conversacional.
 */
export interface HistoryMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

/**
 * Mensaje a persistir en la memoria conversacional.
 */
export interface PersistMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
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
  personality: PersonalityConfig;
  relevanceThreshold: number;
  topK: number;
  maxResponseLength: number;
  memoryWindow: number;
  welcomeMessage?: string;
  failedAttemptsBeforeEscalation: number;
  noInfoMessage: string;
  errorMessage: string;

  /**
   * Texto de oferta de escalamiento mostrado al usuario cuando se detecta
   * necesidad de transferir a un agente humano.
   *
   * Valida: Requisitos 12.1, 12.7
   */
  escalationOfferMessage: string;

  /**
   * Mensaje de transición enviado al usuario cuando se confirma el escalamiento
   * a un agente humano.
   *
   * Valida: Requisito 12.4
   */
  escalationTransitionMessage: string;

  /**
   * Mensaje enviado al usuario cuando el timeout de escalamiento se cumple
   * sin que un humano atienda, y el agente retoma la conversación.
   *
   * Valida: Requisito 12.7
   */
  escalationReturnMessage: string;

  /**
   * Texto de acknowledgment enviado al usuario cuando el procesamiento
   * supera el umbral de tiempo configurado. Máximo 500 caracteres.
   * Si no se configura, se usa el mensaje por defecto del sistema.
   *
   * Valida: Requisitos 10.1, 10.2
   */
  acknowledgmentMessage?: string;

  /**
   * Umbral en segundos antes de enviar el mensaje de acknowledgment.
   * Rango permitido: 2-15 segundos. Default: 5.
   *
   * Valida: Requisito 10.1
   */
  acknowledgmentThreshold: number;

  /**
   * Ventana de tiempo en segundos para agrupar mensajes consecutivos
   * del mismo usuario (burst deduplication).
   * Rango permitido: 1-10 segundos. Default: 3.
   *
   * Valida: Requisito 11.1
   */
  burstWindow: number;

  /**
   * Tiempo en minutos que se espera a que un humano atienda el escalamiento
   * antes de que el agente retome la conversación automáticamente.
   * Rango permitido: 5-60 minutos. Default: 15.
   *
   * Valida: Requisito 12.7
   */
  escalationTimeout: number;

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
