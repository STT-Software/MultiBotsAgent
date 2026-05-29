import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { MongoDBChatMemoryRepository } from '@multibotagents/db';
import { MemoryService } from '@multibotagents/core';
import { MessageRole } from '@multibotagents/types';
import type { HistoryMessage, MemoryService as IRagMemoryService, PersistMessage, ChatMessage } from '@multibotagents/types';

/**
 * Implementación de MemoryService usando MongoDB.
 * Gestiona el historial conversacional con persistencia delegando a `@multibotagents/core`.
 *
 * Valida: Requisitos 2.1, 8.1, 8.2, 9.1, 10.4
 */
@Injectable()
export class MongoMemoryProvider implements IRagMemoryService, OnModuleDestroy {
  private readonly logger = new Logger(MongoMemoryProvider.name);
  private readonly client: MongoClient;
  private readonly dbName: string;
  private readonly sessionTimeoutMs: number;
  private readonly coreMemoryService: MemoryService;
  private readonly repository: MongoDBChatMemoryRepository;

  constructor() {
    const connectionString =
      process.env.MONGODB_MEMORY_URI ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017';

    this.dbName =
      process.env.MONGODB_MEMORY_DB ||
      process.env.MONGODB_DB ||
      'multibotagents';

    this.sessionTimeoutMs =
      Number(process.env.SESSION_TIMEOUT_MS) || 86400000; // 24 hours default

    this.client = new MongoClient(connectionString);
    const db = this.client.db(this.dbName);
    this.repository = new MongoDBChatMemoryRepository(db);
    this.coreMemoryService = new MemoryService({
      chatMemoryRepository: this.repository,
      logger: {
        info: (msg, meta) => this.logger.debug(`${msg} ${meta ? JSON.stringify(meta) : ''}`),
        error: (msg, meta) => this.logger.error(`${msg} ${meta ? JSON.stringify(meta) : ''}`),
        warn: (msg, meta) => this.logger.warn(`${msg} ${meta ? JSON.stringify(meta) : ''}`),
      },
    });

    this.logger.log(
      `MongoMemoryProvider initialized: db=${this.dbName}, sessionTimeout=${this.sessionTimeoutMs}ms`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.close();
      this.logger.log('MongoDB memory client connection closed');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Error closing MongoDB memory client', { error: err.message });
    }
  }

  /**
   * Recupera el historial de mensajes de una conversación respetando la ventana de memoria.
   *
   * @param conversationId - ID de la conversación
   * @param windowSize - Número máximo de mensajes a recuperar
   * @returns Array de HistoryMessage en orden cronológico (más antiguo primero)
   */
  async getHistory(conversationId: string, windowSize: number): Promise<HistoryMessage[]> {
    this.logger.debug('Retrieving conversation history', { conversationId, windowSize });

    try {
      // getHistory de core ya filtra mensajes de operador y escalados si includeEscalated es false
      const chatMessages = await this.coreMemoryService.getHistory(conversationId, windowSize, false);

      const messages: HistoryMessage[] = chatMessages.map((msg) => ({
        role: msg.type === 'human'
          ? MessageRole.USER
          : MessageRole.ASSISTANT,
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      this.logger.debug('History retrieved successfully', {
        conversationId,
        messagesCount: messages.length,
        windowSize,
      });

      return messages;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to retrieve conversation history', {
        conversationId,
        error: err.message,
        stack: err.stack,
      });
      throw new Error(`Failed to retrieve history: ${err.message}`);
    }
  }

  /**
   * Persiste un nuevo mensaje en el historial conversacional.
   *
   * @param conversationId - ID de la conversación
   * @param message - Mensaje a persistir (role, content, timestamp, metadata opcional)
   */
  async saveMessage(conversationId: string, message: PersistMessage): Promise<void> {
    this.logger.debug('Saving message', {
      conversationId,
      role: message.role,
      contentLength: message.content.length,
    });

    try {
      const chatMessage = {
        type: message.role === MessageRole.USER
          ? 'human' as const
          : 'ai' as const,
        content: message.content,
        timestamp: message.timestamp,
        source: message.role === MessageRole.ASSISTANT ? 'agent' as const : undefined,
      };

      await this.coreMemoryService.addMessage(conversationId, chatMessage);

      this.logger.debug('Message saved successfully', {
        conversationId,
        role: message.role,
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to save message', {
        conversationId,
        role: message.role,
        error: err.message,
        stack: err.stack,
      });
      throw new Error(`Failed to save message: ${err.message}`);
    }
  }

  /**
   * Determina si una conversación es nueva (sin historial activo o sesión expirada).
   *
   * @param conversationId - ID de la conversación
   * @returns true si la sesión es nueva, false si hay actividad reciente
   */
  async isNewSession(conversationId: string): Promise<boolean> {
    this.logger.debug('Checking if session is new', { conversationId });

    try {
      const session = await this.repository.findBySessionId(conversationId);
      if (!session || !session.messages || session.messages.length === 0) {
        return true;
      }

      const lastMessage = session.messages[session.messages.length - 1];
      const cutoffDate = new Date(Date.now() - this.sessionTimeoutMs);
      const isNew = lastMessage.timestamp.getTime() < cutoffDate.getTime();

      this.logger.debug('Session check completed', {
        conversationId,
        isNewSession: isNew,
        sessionTimeoutMs: this.sessionTimeoutMs,
      });

      return isNew;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to check session status', {
        conversationId,
        error: err.message,
        stack: err.stack,
      });
      throw new Error(`Failed to check session status: ${err.message}`);
    }
  }

  /**
   * Agrega un mensaje directamente usando la estructura completa ChatMessage.
   *
   * @param conversationId - ID de la conversación
   * @param message - Mensaje estructurado completo
   */
  async addMessage(conversationId: string, message: ChatMessage): Promise<void> {
    this.logger.debug('Adding chat message directly', { conversationId, type: message.type });
    try {
      await this.coreMemoryService.addMessage(conversationId, message);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to add message directly', {
        conversationId,
        error: err.message,
        stack: err.stack,
      });
      throw new Error(`Failed to add message directly: ${err.message}`);
    }
  }

  /**
   * Refresca el TTL de la conversación actualizando updatedAt.
   *
   * @param conversationId - ID de la conversación
   */
  async refreshTTL(conversationId: string): Promise<void> {
    this.logger.debug('Refreshing session TTL', { conversationId });
    try {
      await this.coreMemoryService.refreshTTL(conversationId);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to refresh TTL', {
        conversationId,
        error: err.message,
        stack: err.stack,
      });
      throw new Error(`Failed to refresh TTL: ${err.message}`);
    }
  }
}
