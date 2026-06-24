import type { ChatMessage } from "@multibotagents/types";
import type { IChatMemoryRepository } from "./interfaces/repositories";

export interface ChatMemoryLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

export interface MemoryServiceConfig {
  defaultLimit?: number;
}

export interface MemoryServiceDeps {
  chatMemoryRepository: IChatMemoryRepository;
  logger: ChatMemoryLogger;
  config?: MemoryServiceConfig;
}

export class MemoryService {
  private readonly chatMemoryRepository: IChatMemoryRepository;
  private readonly logger: ChatMemoryLogger;
  private readonly defaultLimit: number;

  constructor(deps: MemoryServiceDeps) {
    this.chatMemoryRepository = deps.chatMemoryRepository;
    this.logger = deps.logger;
    this.defaultLimit = deps.config?.defaultLimit ?? 10;
  }

  /**
   * Obtiene el historial omitiendo mensajes del operador e interacciones durante el escalamiento por defecto.
   * Retorna los últimos N mensajes especificados por `limit`.
   */
  async getHistory(
    sessionId: string,
    limit?: number,
    includeEscalated: boolean = false
  ): Promise<ChatMessage[]> {
    const session = await this.chatMemoryRepository.findBySessionId(sessionId);
    if (!session || !session.messages || session.messages.length === 0) {
      return [];
    }

    let filteredMessages = session.messages;

    if (!includeEscalated) {
      filteredMessages = filteredMessages.filter(
        (msg) => msg.source !== "operator" && !msg.isEscalated
      );
    }

    const maxLimit = limit ?? this.defaultLimit;
    return filteredMessages.slice(-maxLimit);
  }

  /**
   * Guarda un par de mensajes (usuario + agente) en una sola operación atómica.
   */
  async saveContext(
    sessionId: string,
    humanMessage: string,
    aiMessage: string
  ): Promise<void> {
    const messages: ChatMessage[] = [
      {
        type: "human",
        content: humanMessage,
        timestamp: new Date(),
      },
      {
        type: "ai",
        content: aiMessage,
        timestamp: new Date(),
        source: "agent",
      },
    ];

    await this.chatMemoryRepository.appendMessages(sessionId, messages);
    this.logger.info("Saved context successfully", { sessionId });
  }

  /**
   * Añade un único mensaje. Útil para mensajes del sistema o respuestas de operadores.
   */
  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    await this.chatMemoryRepository.appendMessages(sessionId, [message]);
    this.logger.info("Added message successfully", { sessionId, type: message.type });
  }

  /**
   * Renueva explícitamente el contador TTL actualizando el updatedAt.
   */
  async refreshTTL(sessionId: string): Promise<void> {
    const session = await this.chatMemoryRepository.findBySessionId(sessionId);
    if (!session) {
      this.logger.warn("Attempted to refresh TTL for non-existent session", { sessionId });
      return;
    }
    await this.chatMemoryRepository.touchSession(sessionId);
    this.logger.info("Refreshed session TTL successfully", { sessionId });
  }

  /**
   * Elimina toda la memoria de la sesión.
   */
  async clearMemory(sessionId: string): Promise<void> {
    await this.chatMemoryRepository.deleteBySessionId(sessionId);
    this.logger.info("Cleared session memory successfully", { sessionId });
  }
}
