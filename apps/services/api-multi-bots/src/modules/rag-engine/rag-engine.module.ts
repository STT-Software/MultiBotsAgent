import { Module } from '@nestjs/common';

import {
  RAG_AGENT_CONFIG_SERVICE,
  RAG_ESCALATION_EMITTER,
  RAG_LLM_PROVIDER,
  RAG_MEMORY_SERVICE,
  RAG_VECTOR_SEARCH,
} from './constants/injection-tokens';
import { PlaceholderAgentConfigProvider } from './providers/agent-config.provider';
import { BedrockLlmProvider } from './providers/bedrock-llm.provider';
import { EventEmitterEscalationProvider } from './providers/event-emitter-escalation.provider';
import { MongoMemoryProvider } from './providers/mongo-memory.provider';
import { MongoVectorSearchProvider } from './providers/mongo-vector-search.provider';
import { RagEngineService } from './rag-engine.service';
import { AcknowledgmentService } from './services/acknowledgment.service';
import { BurstDeduplicationService } from './services/burst-deduplication.service';
import { EscalationDetectionService } from './services/escalation-detection.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { ReRankingService } from './services/re-ranking.service';
import { ResponseFormatterService } from './services/response-formatter.service';

/**
 * Módulo NestJS del Motor de Agente RAG.
 * Registra todos los providers con injection tokens y exporta RagEngineService.
 *
 * Valida: Requisito 10.5, 15.5
 */
@Module({
  providers: [
    RagEngineService,
    PromptBuilderService,
    ReRankingService,
    ResponseFormatterService,
    AcknowledgmentService,
    BurstDeduplicationService,
    EscalationDetectionService,
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
      useClass: PlaceholderAgentConfigProvider,
    },
    {
      provide: RAG_ESCALATION_EMITTER,
      useClass: EventEmitterEscalationProvider,
    },
  ],
  exports: [RagEngineService],
})
export class RagEngineModule {}
