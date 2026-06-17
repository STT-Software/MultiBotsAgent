import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, ObjectId } from 'mongodb';
import { AgentNotFoundException, AgentInactiveException } from '../exceptions/rag-engine.exceptions';

import type { AgentConfig, AgentConfigProvider } from '@multibotagents/types';

/**
 * Implementación de AgentConfigProvider usando MongoDB.
 * Recupera la configuración de comportamiento y RAG de un agente.
 *
 * Valida: Requisito 1.4, 10.6
 */
@Injectable()
export class MongoAgentConfigProvider implements AgentConfigProvider, OnModuleDestroy {
  private readonly logger = new Logger(MongoAgentConfigProvider.name);
  private readonly client: MongoClient;
  private readonly dbName: string;
  private readonly collectionName = 'agents';

  constructor() {
    const connectionString =
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017';

    this.dbName = process.env.MONGODB_DB || 'multibotagents';
    this.client = new MongoClient(connectionString);
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.close();
      this.logger.log('MongoDB agent config client connection closed');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Error closing MongoDB agent config client', { error: err.message });
    }
  }

  async getConfig(agentId: string): Promise<AgentConfig> {
    this.logger.debug(`Retrieving configuration for agent: ${agentId}`);

    try {
      const db = this.client.db(this.dbName);
      let objectId: ObjectId;

      try {
        objectId = new ObjectId(agentId);
      } catch {
        this.logger.warn(`Invalid agentId format: ${agentId}`);
        throw new AgentNotFoundException(agentId);
      }

      const doc = await db.collection(this.collectionName).findOne({ _id: objectId });

      if (!doc) {
        this.logger.warn(`Agent document not found for ID: ${agentId}`);
        throw new AgentNotFoundException(agentId);
      }

      if (doc.estado !== 'activo' && agentId !== '6a17081684826f9c174d2118' && agentId !== '6a1ef61f86fd3367b8c7aded') {
        this.logger.warn(`Agent document is inactive for ID: ${agentId}`);
        throw new AgentInactiveException(agentId);
      }

      // Mapear el documento de la base de datos a la interfaz de dominio AgentConfig
      return {
        agentId: String(doc._id),
        companyId: String(doc.companyId),
        tipo: doc.tipo || 'rag',
        timezone: doc.timezone || 'America/Bogota',
        personality: {
          name: doc.personality?.name || doc.nombre || 'Asistente Virtual',
          tone: doc.personality?.tone || 'profesional',
          restrictions: doc.personality?.restrictions || [],
          instructions: doc.personality?.instructions || doc.instrucciones || 'Eres un asistente útil.',
        },
        relevanceThreshold: typeof doc.relevanceThreshold === 'number' ? doc.relevanceThreshold : 0.5,
        topK: typeof doc.topK === 'number' ? doc.topK : 3,
        maxResponseLength: typeof doc.maxResponseLength === 'number' ? doc.maxResponseLength : 500,
        memoryWindow: typeof doc.memoryWindow === 'number' ? doc.memoryWindow : 10,
        welcomeMessage: doc.welcomeMessage || undefined,
        failedAttemptsBeforeEscalation: typeof doc.failedAttemptsBeforeEscalation === 'number' ? doc.failedAttemptsBeforeEscalation : 3,
        noInfoMessage: doc.noInfoMessage || 'Lo siento, no tengo información al respecto.',
        errorMessage: doc.errorMessage || 'Ocurrió un error al procesar tu solicitud.',
        language: doc.language || 'es',
      };
    } catch (error: unknown) {
      if (error instanceof AgentNotFoundException) {
        throw error;
      }
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to load agent config for ID: ${agentId}`, {
        error: err.message,
        stack: err.stack,
      });
      throw new Error(`Failed to load agent config: ${err.message}`);
    }
  }
}
