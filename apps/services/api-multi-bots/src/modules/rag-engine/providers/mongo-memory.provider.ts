import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, type Collection, type Document } from 'mongodb';

import type { ConversationStatus, HistoryMessage, MemoryService, PersistMessage } from '@multibotagents/types';

/**
 * Implementación de MemoryService usando MongoDB.
 * Gestiona el historial conversacional con persistencia en una colección de mensajes.
 *
 * Funcionalidades:
 * - getHistory: Recupera los últimos N mensajes de una conversación (ventana de memoria)
 * - saveMessage: Persiste un nuevo mensaje en el historial
 * - isNewSession: Determina si una conversación es nueva (sin mensajes o sesión expirada)
 *
 * La sesión se considera expirada si no hay actividad en las últimas 24 horas (configurable).
 *
 * Valida: Requisitos 2.1, 8.1, 8.2, 9.1, 10.4
 */
@Injectable()
export class MongoMemoryProvider implements MemoryService, OnModuleDestroy {
  private readonly logger = new Logger(MongoMemoryProvider.name);
  private readonly client: MongoClient;
  private readonly dbName: string;
  private readonly collectionName: string;
  private readonly sessionTimeoutMs: number;

  constructor() {
    const connectionString =
      process.env.MONGODB_MEMORY_URI ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017';

    this.dbName =
      process.env.MONGODB_MEMORY_DB ||
      process.env.MONGODB_DB ||
      'multibotagents';

    this.collectionName =
      process.env.MONGODB_MEMORY_COLLECTION || 'messages';

    this.sessionTimeoutMs =
      Number(process.env.SESSION_TIMEOUT_MS) || 86400000; // 24 hours default

    this.client = new MongoClient(connectionString);

    this.logger.log(
      `MongoMemoryProvider initialized: db=${this.dbName}, collection=${this.collectionName}, sessionTimeout=${this.sessionTimeoutMs}ms`,
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
   * Consulta los últimos `windowSize` mensajes ordenados por timestamp descendente,
   * luego los invierte para retornarlos en orden cronológico.
   *
   * @param conversationId - ID de la conversación
   * @param windowSize - Número máximo de mensajes a recuperar
   * @returns Array de HistoryMessage en orden cronológico (más antiguo primero)
   */
  async getHistory(conversationId: string, windowSize: number): Promise<HistoryMessage[]> {
    this.logger.debug('Retrieving conversation history', { conversationId, windowSize });

    try {
      const collection = this.getCollection();

      const documents = await collection
        .find({ conversationId })
        .sort({ timestamp: -1 })
        .limit(windowSize)
        .toArray();

      // Reverse to return in chronological order (oldest first)
      const messages = documents.reverse().map((doc) => this.mapToHistoryMessage(doc));

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
      const collection = this.getCollection();

      const document = {
        conversationId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        metadata: message.metadata ?? {},
      };

      await collection.insertOne(document);

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
   * Una sesión se considera nueva si:
   * - No existen mensajes para el conversationId, O
   * - El último mensaje fue enviado hace más de `sessionTimeoutMs` milisegundos
   *
   * @param conversationId - ID de la conversación
   * @returns true si la sesión es nueva, false si hay actividad reciente
   */
  async isNewSession(conversationId: string): Promise<boolean> {
    this.logger.debug('Checking if session is new', { conversationId });

    try {
      const collection = this.getCollection();

      const cutoffDate = new Date(Date.now() - this.sessionTimeoutMs);

      // Find the most recent message within the session timeout window
      const recentMessage = await collection.findOne(
        {
          conversationId,
          timestamp: { $gte: cutoffDate },
        },
        {
          sort: { timestamp: -1 },
        },
      );

      const isNew = recentMessage === null;

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
   * Obtiene el status actual de una conversación.
   * Graceful degradation: si falla, el consumidor debe asumir "active".
   *
   * @param conversationId - ID de la conversación
   * @returns Status de la conversación ('active' | 'escalated' | 'paused')
   *
   * Valida: Requisitos 12.4, 13.1, 13.2
   */
  async getConversationStatus(conversationId: string): Promise<ConversationStatus> {
    this.logger.debug('Getting conversation status', { conversationId });

    try {
      const collection = this.client.db(this.dbName).collection('conversations');

      const conversation = await collection.findOne(
        { _id: conversationId as unknown as Document['_id'] },
        { projection: { status: 1 } },
      );

      const status = (conversation?.status as ConversationStatus) ?? 'active';

      this.logger.debug('Conversation status retrieved', { conversationId, status });

      return status;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get conversation status, assuming active (graceful degradation)', {
        conversationId,
        error: err.message,
        stack: err.stack,
      });
      // Graceful degradation: si falla, asumir "active"
      return 'active';
    }
  }

  /**
   * Actualiza el status de una conversación.
   *
   * @param conversationId - ID de la conversación
   * @param status - Nuevo status ('active' | 'escalated' | 'paused')
   *
   * Valida: Requisitos 12.4, 13.1, 13.2
   */
  async updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<void> {
    this.logger.debug('Updating conversation status', { conversationId, status });

    try {
      const collection = this.client.db(this.dbName).collection('conversations');

      await collection.updateOne(
        { _id: conversationId as unknown as Document['_id'] },
        { $set: { status, updatedAt: new Date() } },
        { upsert: true },
      );

      this.logger.debug('Conversation status updated', { conversationId, status });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to update conversation status', {
        conversationId,
        status,
        error: err.message,
        stack: err.stack,
      });
      throw new Error(`Failed to update conversation status: ${err.message}`);
    }
  }

  /**
   * Obtiene la referencia a la colección de mensajes en MongoDB.
   */
  private getCollection(): Collection<Document> {
    return this.client.db(this.dbName).collection(this.collectionName);
  }

  /**
   * Mapea un documento de MongoDB a HistoryMessage.
   */
  private mapToHistoryMessage(doc: Document): HistoryMessage {
    return {
      role: doc.role,
      content: doc.content ?? '',
      timestamp: doc.timestamp instanceof Date ? doc.timestamp : new Date(doc.timestamp),
    };
  }
}
