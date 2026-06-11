import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { EscalatedConversationRepository } from '@multibotagents/db';

import {
  RAG_AGENT_CONFIG_SERVICE,
  RAG_LLM_PROVIDER,
  RAG_MEMORY_SERVICE,
  RAG_VECTOR_SEARCH,
} from './constants/injection-tokens';
import { MongoAgentConfigProvider } from './providers/agent-config.provider';
import { BedrockLlmProvider } from './providers/bedrock-llm.provider';
import { MongoMemoryProvider } from './providers/mongo-memory.provider';
import { MongoVectorSearchProvider } from './providers/mongo-vector-search.provider';
import { RagEngineService } from './rag-engine.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { ReRankingService } from './services/re-ranking.service';
import { ResponseFormatterService } from './services/response-formatter.service';
import { RagEngineController } from './rag-engine.controller';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Módulo NestJS del Motor de Agente RAG.
 * Registra todos los providers con injection tokens y exporta RagEngineService.
 *
 * Valida: Requisito 10.5
 */
@Module({
  imports: [BookingsModule, NotificationsModule],
  controllers: [RagEngineController],
  providers: [
    RagEngineService,
    PromptBuilderService,
    ReRankingService,
    ResponseFormatterService,
    {
      provide: RAG_LLM_PROVIDER,
      useClass: BedrockLlmProvider,
    },
    {
      provide: RAG_VECTOR_SEARCH,
      useClass: MongoVectorSearchProvider,
    },
    {
      provide: RAG_MEMORY_SERVICE,
      useClass: MongoMemoryProvider,
    },
    {
      provide: RAG_AGENT_CONFIG_SERVICE,
      useClass: MongoAgentConfigProvider,
    },
    {
      provide: 'MONGO_CLIENT',
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is required');
        return new MongoClient(uri);
      },
    },
    {
      provide: 'ESCALATED_CONVERSATION_REPO',
      useFactory: (client: MongoClient) => new EscalatedConversationRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
  ],
  exports: [RagEngineService, RAG_MEMORY_SERVICE],
})
export class RagEngineModule {}
