import { describe, it, expect } from 'vitest';
import { ToolMessage } from '@langchain/core/messages';
import { RagEngineService } from '../rag-engine.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { ReRankingService } from '../services/re-ranking.service';
import { ResponseFormatterService } from '../services/response-formatter.service';
import {
  EscalationReason,
  ResponseType,
} from '@multibotagents/types';
import type {
  AgentConfig,
  AgentConfigProvider,
  LlmProvider,
  LlmPrompt,
  LlmResponse,
  MemoryService,
  RagProcessInput,
  VectorSearchService,
} from '@multibotagents/types';

/**
 * Unit tests para escenarios específicos del orquestador RagEngineService.
 * Tests determinísticos con inputs y outputs concretos.
 *
 * **Validates: Requirements 2.2, 3.5, 6.3, 7.1, 8.3, 9.2, 9.3**
 */

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AgentConfig = {
  agentId: 'agent-001',
  companyId: '507f1f77bcf86cd799439011',
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
  language: 'es',
};

const DEFAULT_INPUT: RagProcessInput = {
  agentId: 'agent-001',
  conversationId: 'conv-001',
  userMessage: '¿Cuál es el horario de atención?',
  timestamp: new Date('2024-01-15T10:00:00Z'),
};

// ─── Mock Factory ────────────────────────────────────────────────────────────

interface MockDeps {
  llmProvider: LlmProvider;
  vectorSearch: VectorSearchService;
  memoryService: MemoryService;
  agentConfigProvider: AgentConfigProvider;
  escalatedRepo: any;
}

function createMockDependencies(overrides?: Partial<MockDeps>): MockDeps {
  const mockLlmProvider: LlmProvider = {
    generate: async (_prompt: LlmPrompt): Promise<LlmResponse> => ({
      content: 'El horario de atención es de lunes a viernes de 9:00 a 18:00.',
      tokensUsed: 25,
      finishReason: 'stop',
    }),
  };

  const mockVectorSearch: VectorSearchService = {
    search: async () => [
      {
        fragmentId: 'frag-001',
        content: 'Horario de atención: lunes a viernes de 9:00 a 18:00.',
        score: 0.92,
        metadata: { source: 'faq' },
      },
    ],
  };

  const mockMemoryService: MemoryService = {
    getHistory: async () => [],
    saveMessage: async () => {},
    isNewSession: async () => false,
  };

  const mockAgentConfigProvider: AgentConfigProvider = {
    getConfig: async () => DEFAULT_CONFIG,
  };

  const mockEscalatedRepo = {
    findByUserIdAndStatus: async () => null,
    create: async () => {},
    addMessage: async () => {},
  };

  return {
    llmProvider: overrides?.llmProvider ?? mockLlmProvider,
    vectorSearch: overrides?.vectorSearch ?? mockVectorSearch,
    memoryService: overrides?.memoryService ?? mockMemoryService,
    agentConfigProvider: overrides?.agentConfigProvider ?? mockAgentConfigProvider,
    escalatedRepo: overrides?.escalatedRepo ?? mockEscalatedRepo,
  };
}

function createService(deps: MockDeps): RagEngineService {
  const promptBuilder = new PromptBuilderService();
  const reRankingService = new ReRankingService(deps.llmProvider);
  const responseFormatter = new ResponseFormatterService();
  const mockBookingsService = {
    checkAvailability: async () => [],
    createBooking: async () => ({}),
  } as any;
  const mockEventEmitter = { emit: () => {} } as any;
  const mockOrdersService = {
    createOrder: async () => ({}),
    getOrder: async () => ({}),
    cancelOrder: async () => ({}),
  } as any;

  return new RagEngineService(
    deps.llmProvider,
    deps.vectorSearch,
    deps.memoryService,
    deps.agentConfigProvider,
    promptBuilder,
    reRankingService,
    responseFormatter,
    deps.escalatedRepo,
    mockEventEmitter,
    mockBookingsService,
    mockOrdersService,
  );
}

// ─── Unit Tests ──────────────────────────────────────────────────────────────

describe('RagEngineService - Unit Tests (Escenarios específicos)', () => {
  describe('Happy path completo', () => {
    it('should process a valid query end-to-end and return a successful response', async () => {
      let callCount = 0;
      const deps = createMockDependencies({
        llmProvider: {
          generate: async () => {
            callCount++;
            // First call: re-ranking validates fragment at index 0
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            // Second call: main LLM response
            return {
              content: 'El horario de atención es de lunes a viernes de 9:00 a 18:00.',
              tokensUsed: 25,
              finishReason: 'stop',
            };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.conversationId).toBe('conv-001');
      expect(result.escalated).toBe(false);
      expect(result.escalationReason).toBeUndefined();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe(ResponseType.TEXT);
      expect(result.messages[0].content).toBe(
        'El horario de atención es de lunes a viernes de 9:00 a 18:00.',
      );
    });

    it('should persist user and assistant messages via MemoryService', async () => {
      const savedMessages: Array<{ conversationId: string; role: string; content: string }> = [];
      let callCount = 0;

      const deps = createMockDependencies({
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta del LLM', tokensUsed: 15, finishReason: 'stop' };
          },
        },
        memoryService: {
          getHistory: async () => [],
          saveMessage: async (conversationId, message) => {
            savedMessages.push({ conversationId, role: message.role, content: message.content });
          },
          isNewSession: async () => false,
        },
      });

      const service = createService(deps);
      await service.processQuery(DEFAULT_INPUT);

      expect(savedMessages).toHaveLength(2);
      expect(savedMessages[0].conversationId).toBe('conv-001');
      expect(savedMessages[0].role).toBe('user');
      expect(savedMessages[0].content).toBe('¿Cuál es el horario de atención?');
      expect(savedMessages[1].role).toBe('assistant');
      expect(savedMessages[1].content).toBe('Respuesta del LLM');
    });
  });

  describe('Análisis de intención de escalamiento (TRANSFER)', () => {
    it('should return friendly transfer message with escalated=true and explicit type when LLM returns TRANSFER', async () => {
      const deps = createMockDependencies({
        vectorSearch: {
          search: async () => [],
        },
        llmProvider: {
          generate: async () => ({ content: 'TRANSFER', tokensUsed: 5, finishReason: 'stop' }),
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.conversationId).toBe('conv-001');
      expect(result.escalated).toBe(true);
      expect(result.escalationReason).toBe(EscalationReason.LOW_RELEVANCE);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe(ResponseType.TEXT);
      expect(result.messages[0].content).toBe('Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.');
    });
  });

  describe('Base de conocimiento vacía (Req 3.5)', () => {
    it('should return noInfoMessage with escalated=true and reason=low_relevance when vector search returns empty and LLM returns NO_INFO', async () => {
      const deps = createMockDependencies({
        vectorSearch: {
          search: async () => [],
        },
        llmProvider: {
          generate: async () => ({ content: 'NO_INFO', tokensUsed: 5, finishReason: 'stop' }),
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.conversationId).toBe('conv-001');
      expect(result.escalated).toBe(true);
      expect(result.escalationReason).toBe(EscalationReason.LOW_RELEVANCE);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe(ResponseType.TEXT);
      expect(result.messages[0].content).toBe('No tengo información sobre eso');
    });

    it('should invoke LLM even when knowledge base is empty to handle small talk', async () => {
      let llmCalled = false;

      const deps = createMockDependencies({
        vectorSearch: {
          search: async () => [],
        },
        llmProvider: {
          generate: async () => {
            llmCalled = true;
            return { content: 'Hola, soy un asistente', tokensUsed: 5, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(llmCalled).toBe(true);
      expect(result.escalated).toBe(false);
      expect(result.messages[0].content).toBe('Hola, soy un asistente');
    });
  });

  describe('Re-ranking rechaza todos los fragmentos', () => {
    it('should return noInfoMessage with escalated=true when re-ranking returns empty array and LLM returns NO_INFO', async () => {
      let callCount = 0;
      const deps = createMockDependencies({
        vectorSearch: {
          search: async () => [
            { fragmentId: 'frag-001', content: 'Contenido irrelevante', score: 0.85, metadata: {} },
            { fragmentId: 'frag-002', content: 'Otro contenido', score: 0.80, metadata: {} },
          ],
        },
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              // Re-ranking returns empty array (no fragments are relevant)
              return { content: '[]', tokensUsed: 5, finishReason: 'stop' };
            }
            // Main LLM call returns NO_INFO
            return { content: 'NO_INFO', tokensUsed: 5, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.escalated).toBe(true);
      expect(result.escalationReason).toBe(EscalationReason.LOW_RELEVANCE);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('No tengo información sobre eso');
    });
  });

  describe('Nueva sesión con welcome message (Req 9.2)', () => {
    it('should prepend welcome message as first ResponseMessage when isNewSession=true and welcomeMessage is configured', async () => {
      let callCount = 0;
      const configWithWelcome: AgentConfig = {
        ...DEFAULT_CONFIG,
        welcomeMessage: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
      };

      const deps = createMockDependencies({
        memoryService: {
          getHistory: async () => [],
          saveMessage: async () => {},
          isNewSession: async () => true,
        },
        agentConfigProvider: {
          getConfig: async () => configWithWelcome,
        },
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta a tu consulta.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.escalated).toBe(false);
      expect(result.messages.length).toBeGreaterThanOrEqual(2);
      expect(result.messages[0].type).toBe(ResponseType.TEXT);
      expect(result.messages[0].content).toBe('¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?');
      expect(result.messages[1].type).toBe(ResponseType.TEXT);
      expect(result.messages[1].content).toBe('Respuesta a tu consulta.');
    });
  });

  describe('Nueva sesión sin welcome message (Req 9.3)', () => {
    it('should NOT prepend welcome message when isNewSession=true but welcomeMessage is undefined', async () => {
      let callCount = 0;
      const configWithoutWelcome: AgentConfig = {
        ...DEFAULT_CONFIG,
        welcomeMessage: undefined,
      };

      const deps = createMockDependencies({
        memoryService: {
          getHistory: async () => [],
          saveMessage: async () => {},
          isNewSession: async () => true,
        },
        agentConfigProvider: {
          getConfig: async () => configWithoutWelcome,
        },
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta directa sin bienvenida.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.escalated).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe(ResponseType.TEXT);
      expect(result.messages[0].content).toBe('Respuesta directa sin bienvenida.');
    });

    it('should NOT prepend welcome message when isNewSession=false even if welcomeMessage is configured', async () => {
      let callCount = 0;
      const configWithWelcome: AgentConfig = {
        ...DEFAULT_CONFIG,
        welcomeMessage: '¡Hola! Bienvenido.',
      };

      const deps = createMockDependencies({
        memoryService: {
          getHistory: async () => [],
          saveMessage: async () => {},
          isNewSession: async () => false,
        },
        agentConfigProvider: {
          getConfig: async () => configWithWelcome,
        },
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta sin bienvenida.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.escalated).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Respuesta sin bienvenida.');
      expect(result.messages[0].content).not.toBe('¡Hola! Bienvenido.');
    });
  });

  describe('MemoryService falla en getHistory (Req 2.2)', () => {
    it('should continue processing and return valid response when getHistory throws', async () => {
      let callCount = 0;

      const deps = createMockDependencies({
        memoryService: {
          getHistory: async () => {
            throw new Error('MongoDB connection timeout');
          },
          saveMessage: async () => {},
          isNewSession: async () => false,
        },
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta sin historial.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.conversationId).toBe('conv-001');
      expect(result.escalated).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Respuesta sin historial.');
    });

    it('should not throw when getHistory fails with any error type', async () => {
      let callCount = 0;

      const deps = createMockDependencies({
        memoryService: {
          getHistory: async () => {
            throw new TypeError('Cannot read properties of undefined');
          },
          saveMessage: async () => {},
          isNewSession: async () => false,
        },
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta válida.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);

      await expect(service.processQuery(DEFAULT_INPUT)).resolves.toBeDefined();
    });
  });

  describe('MemoryService falla en saveMessage (Req 8.3)', () => {
    it('should return the response to the user even when saveMessage throws', async () => {
      let callCount = 0;

      const deps = createMockDependencies({
        memoryService: {
          getHistory: async () => [],
          saveMessage: async () => {
            throw new Error('Write concern timeout');
          },
          isNewSession: async () => false,
        },
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta que sí se entrega al usuario.', tokensUsed: 15, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.conversationId).toBe('conv-001');
      expect(result.escalated).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Respuesta que sí se entrega al usuario.');
    });

    it('should not escalate when saveMessage fails', async () => {
      let callCount = 0;

      const deps = createMockDependencies({
        memoryService: {
          getHistory: async () => [],
          saveMessage: async () => {
            throw new Error('DiskFull');
          },
          isNewSession: async () => false,
        },
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta normal.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.escalated).toBe(false);
      expect(result.escalationReason).toBeUndefined();
    });
  });

  describe('LLM retorna respuesta vacía', () => {
    it('should return errorMessage with escalated=true and reason=llm_unavailable when LLM returns empty content', async () => {
      let callCount = 0;

      const deps = createMockDependencies({
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              // Re-ranking validates fragment
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            // Main LLM returns empty response
            return { content: '', tokensUsed: 0, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.conversationId).toBe('conv-001');
      expect(result.escalated).toBe(true);
      expect(result.escalationReason).toBe(EscalationReason.LLM_UNAVAILABLE);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe(ResponseType.TEXT);
      expect(result.messages[0].content).toBe('Hubo un problema procesando tu consulta');
    });

    it('should return errorMessage when LLM returns whitespace-only content', async () => {
      let callCount = 0;

      const deps = createMockDependencies({
        llmProvider: {
          generate: async () => {
            callCount++;
            if (callCount === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: '   \n\t  ', tokensUsed: 2, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.escalated).toBe(true);
      expect(result.escalationReason).toBe(EscalationReason.LLM_UNAVAILABLE);
      expect(result.messages[0].content).toBe('Hubo un problema procesando tu consulta');
    });
  });

  describe('Agente de Agendamiento (tipo=agendamiento)', () => {
    it('debería ejecutar el flujo de herramientas de agendamiento y retornar la respuesta final', async () => {
      const mockModelWithTools = {
        invoke: async (messages: any[]) => {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage instanceof ToolMessage) {
            return {
              content: 'Cita reservada exitosamente para Juan Pérez el día 2026-06-03 a las 10:00.',
              tool_calls: [],
            };
          }
          return {
            content: '',
            tool_calls: [
              {
                name: 'book_appointment',
                args: {
                  dateTime: '2026-06-03T10:00:00',
                  customerName: 'Juan Pérez',
                  customerPhone: '123456789',
                },
                id: 'call-123',
              },
            ],
          };
        },
      };

      const mockRawModel = {
        bindTools: () => mockModelWithTools,
      };

      const deps = createMockDependencies({
        agentConfigProvider: {
          getConfig: async () => ({
            ...DEFAULT_CONFIG,
            tipo: 'agendamiento',
          }),
        },
        llmProvider: {
          generate: async () => ({ content: '', tokensUsed: 0, finishReason: 'stop' }),
          getModel: () => mockRawModel,
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.escalated).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe(
        'Cita reservada exitosamente para Juan Pérez el día 2026-06-03 a las 10:00.',
      );
    });
  });

  describe('Agente Cotizador (tipo=cotizador)', () => {
    it('debería ejecutar el flujo de herramientas de cotización y retornar la respuesta final', async () => {
      const mockModelWithTools = {
        invoke: async (messages: any[]) => {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage instanceof ToolMessage) {
            return {
              content: 'Pedido #123 creado exitosamente para Juan Pérez por un total de $150.',
              tool_calls: [],
            };
          }
          return {
            content: '',
            tool_calls: [
              {
                name: 'create_order',
                args: {
                  customerName: 'Juan Pérez',
                  customerPhone: '123456789',
                  customerEmail: 'juan.perez@example.com',
                  customerAddress: 'Calle Falsa 123',
                  items: [
                    { nombre: 'Producto A', cantidad: 3, precioUnitario: 50 }
                  ],
                },
                id: 'call-456',
              },
            ],
          };
        },
      };

      const mockRawModel = {
        bindTools: () => mockModelWithTools,
      };

      const deps = createMockDependencies({
        agentConfigProvider: {
          getConfig: async () => ({
            ...DEFAULT_CONFIG,
            tipo: 'cotizador',
          }),
        },
        llmProvider: {
          generate: async () => ({ content: '', tokensUsed: 0, finishReason: 'stop' }),
          getModel: () => mockRawModel,
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      expect(result.escalated).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe(
        'Pedido #123 creado exitosamente para Juan Pérez por un total de $150.',
      );
    });
  });
});
