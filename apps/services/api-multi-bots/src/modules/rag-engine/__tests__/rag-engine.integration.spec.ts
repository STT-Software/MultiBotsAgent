import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  RAG_LLM_PROVIDER,
  RAG_VECTOR_SEARCH,
  RAG_MEMORY_SERVICE,
  RAG_AGENT_CONFIG_SERVICE,
  RAG_ESCALATION_EMITTER,
} from '../constants/injection-tokens';
import { RagEngineService } from '../rag-engine.service';
import { AcknowledgmentService } from '../services/acknowledgment.service';
import { BurstDeduplicationService } from '../services/burst-deduplication.service';
import { EscalationDetectionService } from '../services/escalation-detection.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { ReRankingService } from '../services/re-ranking.service';
import { ResponseFormatterService } from '../services/response-formatter.service';
import { MessageRole } from '@multibotagents/types';
import type {
  AgentConfig,
  LlmPrompt,
  LlmResponse,
  RagProcessInput,
} from '@multibotagents/types';

/**
 * Integration tests para el módulo RagEngine.
 * Verifican el wiring correcto de DI y la interacción entre componentes.
 * Usa Test.createTestingModule con providers explícitos para validar
 * que la inyección de dependencias resuelve correctamente.
 *
 * **Validates: Requirements 10.2, 10.3, 10.4, 10.5**
 */

// ─── Fixtures ────────────────────────────────────────────────────────────────

const AGENT_CONFIG: AgentConfig = {
  agentId: 'agent-integration-001',
  companyId: 'company-001',
  personality: {
    name: 'Asistente',
    tone: 'amigable',
    restrictions: ['No inventar información'],
    instructions: 'Responde de forma clara y concisa',
  },
  relevanceThreshold: 0.7,
  topK: 5,
  maxResponseLength: 1000,
  memoryWindow: 10,
  welcomeMessage: undefined,
  failedAttemptsBeforeEscalation: 3,
  noInfoMessage: 'No tengo información sobre eso',
  errorMessage: 'Hubo un problema procesando tu consulta',
  escalationOfferMessage: '¿Deseas que te comunique con un agente?',
  escalationTransitionMessage: 'Te voy a comunicar con alguien del equipo...',
  escalationReturnMessage: 'No pude comunicarte con alguien. ¿Puedo ayudarte?',
  acknowledgmentMessage: undefined,
  acknowledgmentThreshold: 5,
  burstWindow: 3,
  escalationTimeout: 15,
  language: 'es',
};

const DEFAULT_INPUT: RagProcessInput = {
  agentId: 'agent-integration-001',
  conversationId: 'conv-integration-001',
  userMessage: '¿Cuál es el horario de atención?',
  timestamp: new Date('2024-01-15T10:00:00Z'),
};

describe('RagEngineModule Integration', () => {
  let module: TestingModule;
  let service: RagEngineService;
  let mockLlmProvider: { generate: ReturnType<typeof vi.fn> };
  let mockVectorSearch: { search: ReturnType<typeof vi.fn> };
  let mockMemoryService: {
    getHistory: ReturnType<typeof vi.fn>;
    saveMessage: ReturnType<typeof vi.fn>;
    isNewSession: ReturnType<typeof vi.fn>;
    getConversationStatus: ReturnType<typeof vi.fn>;
    updateConversationStatus: ReturnType<typeof vi.fn>;
  };
  let mockAgentConfigProvider: { getConfig: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    // Create mocks for external providers
    mockLlmProvider = {
      generate: vi.fn().mockImplementation(async (prompt: LlmPrompt): Promise<LlmResponse> => {
        // Re-ranking call: return all indices as valid
        if (prompt.systemPrompt.includes('relevance evaluation')) {
          return { content: '[0, 1]', tokensUsed: 5, finishReason: 'stop' };
        }
        // Main LLM generation call
        return {
          content: 'El horario de atención es de lunes a viernes de 9:00 a 18:00.',
          tokensUsed: 25,
          finishReason: 'stop',
        };
      }),
    };

    mockVectorSearch = {
      search: vi.fn().mockResolvedValue([
        {
          fragmentId: 'frag-001',
          content: 'Horario de atención: lunes a viernes de 9:00 a 18:00.',
          score: 0.92,
          metadata: {},
        },
        {
          fragmentId: 'frag-002',
          content: 'Los sábados atendemos de 9:00 a 13:00.',
          score: 0.85,
          metadata: {},
        },
      ]),
    };

    mockMemoryService = {
      getHistory: vi.fn().mockResolvedValue([]),
      saveMessage: vi.fn().mockResolvedValue(undefined),
      isNewSession: vi.fn().mockResolvedValue(false),
      getConversationStatus: vi.fn().mockResolvedValue('active'),
      updateConversationStatus: vi.fn().mockResolvedValue(undefined),
    };

    mockAgentConfigProvider = {
      getConfig: vi.fn().mockResolvedValue(AGENT_CONFIG),
    };

    // Build the testing module with explicit providers to validate DI wiring.
    // We use useFactory for class-based services because vitest (esbuild) does not
    // emit decorator metadata needed for NestJS class-based injection resolution.
    // This still validates that the DI graph resolves correctly with all tokens.
    const mockEscalationEmitter = { emit: vi.fn().mockResolvedValue(true) };

    module = await Test.createTestingModule({
      providers: [
        {
          provide: RAG_LLM_PROVIDER,
          useValue: mockLlmProvider,
        },
        {
          provide: RAG_VECTOR_SEARCH,
          useValue: mockVectorSearch,
        },
        {
          provide: RAG_MEMORY_SERVICE,
          useValue: mockMemoryService,
        },
        {
          provide: RAG_AGENT_CONFIG_SERVICE,
          useValue: mockAgentConfigProvider,
        },
        {
          provide: RAG_ESCALATION_EMITTER,
          useValue: mockEscalationEmitter,
        },
        {
          provide: PromptBuilderService,
          useFactory: () => new PromptBuilderService(),
        },
        {
          provide: ReRankingService,
          useFactory: (llm: typeof mockLlmProvider) => new ReRankingService(llm),
          inject: [RAG_LLM_PROVIDER],
        },
        {
          provide: ResponseFormatterService,
          useFactory: () => new ResponseFormatterService(),
        },
        {
          provide: BurstDeduplicationService,
          useFactory: () => new BurstDeduplicationService(),
        },
        {
          provide: AcknowledgmentService,
          useFactory: () => new AcknowledgmentService(),
        },
        {
          provide: EscalationDetectionService,
          useFactory: (memory: typeof mockMemoryService, emitter: typeof mockEscalationEmitter) =>
            new EscalationDetectionService(memory, emitter),
          inject: [RAG_MEMORY_SERVICE, RAG_ESCALATION_EMITTER],
        },
        {
          provide: RagEngineService,
          useFactory: (
            llm: typeof mockLlmProvider,
            vectorSearch: typeof mockVectorSearch,
            memory: typeof mockMemoryService,
            configProvider: typeof mockAgentConfigProvider,
            promptBuilder: PromptBuilderService,
            reRanking: ReRankingService,
            responseFormatter: ResponseFormatterService,
            burstDedup: BurstDeduplicationService,
            ack: AcknowledgmentService,
            escalation: EscalationDetectionService,
          ) =>
            new RagEngineService(
              llm,
              vectorSearch,
              memory,
              configProvider,
              promptBuilder,
              reRanking,
              responseFormatter,
              burstDedup,
              ack,
              escalation,
            ),
          inject: [
            RAG_LLM_PROVIDER,
            RAG_VECTOR_SEARCH,
            RAG_MEMORY_SERVICE,
            RAG_AGENT_CONFIG_SERVICE,
            PromptBuilderService,
            ReRankingService,
            ResponseFormatterService,
            BurstDeduplicationService,
            AcknowledgmentService,
            EscalationDetectionService,
          ],
        },
      ],
    }).compile();

    service = module.get<RagEngineService>(RagEngineService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  // ─── Test 1: Module instantiation and DI resolution ─────────────────────────

  it('should instantiate the module and resolve RagEngineService via DI', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(RagEngineService);
  });

  // ─── Test 2: VectorSearchService called with correct params ─────────────────

  it('should call VectorSearchService.search with correct agentId and topK from config', async () => {
    await service.processQuery(DEFAULT_INPUT);

    expect(mockVectorSearch.search).toHaveBeenCalledTimes(1);
    expect(mockVectorSearch.search).toHaveBeenCalledWith(
      DEFAULT_INPUT.agentId,
      DEFAULT_INPUT.userMessage,
      AGENT_CONFIG.topK,
    );
  });

  // ─── Test 3: MemoryService.saveMessage called for user and assistant ────────

  it('should call MemoryService.saveMessage for both user and assistant messages', async () => {
    await service.processQuery(DEFAULT_INPUT);

    expect(mockMemoryService.saveMessage).toHaveBeenCalledTimes(2);

    // First call: user message
    const firstCall = mockMemoryService.saveMessage.mock.calls[0];
    expect(firstCall[0]).toBe(DEFAULT_INPUT.conversationId);
    expect(firstCall[1]).toMatchObject({
      role: MessageRole.USER,
      content: DEFAULT_INPUT.userMessage,
      timestamp: DEFAULT_INPUT.timestamp,
    });

    // Second call: assistant message
    const secondCall = mockMemoryService.saveMessage.mock.calls[1];
    expect(secondCall[0]).toBe(DEFAULT_INPUT.conversationId);
    expect(secondCall[1]).toMatchObject({
      role: MessageRole.ASSISTANT,
    });
    expect(secondCall[1].content).toBeTruthy();
    expect(secondCall[1].timestamp).toBeInstanceOf(Date);
  });

  // ─── Test 4: LlmProvider.generate called with complete LlmPrompt ───────────

  it('should call LlmProvider.generate with a complete LlmPrompt object', async () => {
    await service.processQuery(DEFAULT_INPUT);

    // LlmProvider.generate is called at least once (re-ranking + main generation)
    expect(mockLlmProvider.generate).toHaveBeenCalled();

    // Find the main generation call (not the re-ranking call)
    const calls = mockLlmProvider.generate.mock.calls as LlmPrompt[][];
    const mainGenerationCall = calls.find((call) => {
      const prompt = call[0] as LlmPrompt;
      return prompt.userMessage === DEFAULT_INPUT.userMessage;
    });

    expect(mainGenerationCall).toBeDefined();

    const prompt = mainGenerationCall![0] as LlmPrompt;

    // Verify LlmPrompt structure is complete
    expect(prompt).toHaveProperty('systemPrompt');
    expect(prompt).toHaveProperty('context');
    expect(prompt).toHaveProperty('history');
    expect(prompt).toHaveProperty('userMessage');
    expect(prompt).toHaveProperty('maxResponseLength');

    // Verify values are populated correctly
    expect(prompt.systemPrompt).toBeTruthy();
    expect(prompt.context).toBeTruthy();
    expect(Array.isArray(prompt.history)).toBe(true);
    expect(prompt.userMessage).toBe(DEFAULT_INPUT.userMessage);
    expect(prompt.maxResponseLength).toBe(AGENT_CONFIG.maxResponseLength);
  });
});
