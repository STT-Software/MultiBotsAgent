import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RagEngineService } from '../rag-engine.service';
import { AcknowledgmentService } from '../services/acknowledgment.service';
import { BurstDeduplicationService } from '../services/burst-deduplication.service';
import { EscalationDetectionService } from '../services/escalation-detection.service';
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
  ConversationStatus,
  EscalationEmitter,
  LlmProvider,
  LlmResponse,
  MemoryService,
  RagProcessInput,
  VectorSearchService,
} from '@multibotagents/types';

/**
 * Tests de integración para los flujos 2.2-2.4 del Motor RAG.
 * Verifican la interacción entre servicios reales (BurstDeduplication,
 * Acknowledgment, EscalationDetection) integrados con RagEngineService.
 *
 * Usa instanciación directa sin NestJS DI para evitar problemas con
 * esbuild y metadata de decoradores.
 *
 * **Validates: Requirements 10.1, 11.1, 12.1, 12.4, 12.5, 13.1, 13.2**
 */

// ─── Fixtures ────────────────────────────────────────────────────────────────

const AGENT_CONFIG: AgentConfig = {
  agentId: 'agent-flow-001',
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
  acknowledgmentMessage: 'Dame un momento, estoy buscando esa información...',
  acknowledgmentThreshold: 5,
  burstWindow: 3,
  escalationTimeout: 15,
  language: 'es',
};

const DEFAULT_INPUT: RagProcessInput = {
  agentId: 'agent-flow-001',
  conversationId: 'conv-flow-001',
  userMessage: '¿Cuál es el horario de atención?',
  timestamp: new Date('2024-01-15T10:00:00Z'),
};

// ─── Mock Factory ────────────────────────────────────────────────────────────

interface MockDeps {
  llmProvider: LlmProvider;
  vectorSearch: VectorSearchService;
  memoryService: MemoryService;
  agentConfigProvider: AgentConfigProvider;
  escalationEmitter: EscalationEmitter;
}

function createMockDependencies(overrides?: Partial<MockDeps>): MockDeps {
  let llmCallCount = 0;
  const mockLlmProvider: LlmProvider = {
    generate: async (): Promise<LlmResponse> => {
      llmCallCount++;
      // Re-ranking call: validate fragment at index 0
      if (llmCallCount % 2 === 1) {
        return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
      }
      // Main LLM generation call
      return {
        content: 'El horario de atención es de lunes a viernes de 9:00 a 18:00.',
        tokensUsed: 25,
        finishReason: 'stop',
      };
    },
  };

  const mockVectorSearch: VectorSearchService = {
    search: async () => [
      {
        fragmentId: 'frag-001',
        content: 'Horario de atención: lunes a viernes de 9:00 a 18:00.',
        score: 0.92,
        metadata: {},
      },
    ],
  };

  const mockMemoryService: MemoryService = {
    getHistory: async () => [],
    saveMessage: async () => {},
    isNewSession: async () => false,
    getConversationStatus: async () => 'active',
    updateConversationStatus: async () => {},
  };

  const mockAgentConfigProvider: AgentConfigProvider = {
    getConfig: async () => AGENT_CONFIG,
  };

  const mockEscalationEmitter: EscalationEmitter = {
    emit: async () => true,
  };

  return {
    llmProvider: overrides?.llmProvider ?? mockLlmProvider,
    vectorSearch: overrides?.vectorSearch ?? mockVectorSearch,
    memoryService: overrides?.memoryService ?? mockMemoryService,
    agentConfigProvider: overrides?.agentConfigProvider ?? mockAgentConfigProvider,
    escalationEmitter: overrides?.escalationEmitter ?? mockEscalationEmitter,
  };
}

function createService(deps: MockDeps): RagEngineService {
  const promptBuilder = new PromptBuilderService();
  const reRankingService = new ReRankingService(deps.llmProvider);
  const responseFormatter = new ResponseFormatterService();
  const burstDeduplication = new BurstDeduplicationService();
  const acknowledgmentService = new AcknowledgmentService();
  const escalationDetection = new EscalationDetectionService(
    deps.memoryService,
    deps.escalationEmitter,
  );

  return new RagEngineService(
    deps.llmProvider,
    deps.vectorSearch,
    deps.memoryService,
    deps.agentConfigProvider,
    promptBuilder,
    reRankingService,
    responseFormatter,
    burstDeduplication,
    acknowledgmentService,
    escalationDetection,
  );
}

// ─── Integration Tests ───────────────────────────────────────────────────────

describe('RagEngine Flows Integration Tests (Flujos 2.2-2.4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Flow 2.2: Burst Deduplication Integration ─────────────────────────────

  describe('Flow 2.2 - Burst Deduplication Integration (Req 11.1)', () => {
    it('should group multiple messages within burst window into a single processQuery call', async () => {
      const processedMessages: string[] = [];

      let llmCallCount = 0;
      const deps = createMockDependencies({
        llmProvider: {
          generate: async () => {
            llmCallCount++;
            if (llmCallCount % 2 === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta combinada.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
        memoryService: {
          getHistory: async () => [],
          saveMessage: async (_, message) => {
            if (message.role === 'user') {
              processedMessages.push(message.content);
            }
          },
          isNewSession: async () => false,
          getConversationStatus: async () => 'active',
          updateConversationStatus: async () => {},
        },
      });

      const service = createService(deps);

      // Enviar primer mensaje — inicia la ventana de burst
      const promise1 = service.receiveMessage({
        ...DEFAULT_INPUT,
        userMessage: 'Hola',
      });

      // Enviar segundo mensaje dentro de la ventana
      const promise2 = service.receiveMessage({
        ...DEFAULT_INPUT,
        userMessage: '¿Cuál es el horario?',
      });

      // Enviar tercer mensaje dentro de la ventana
      const promise3 = service.receiveMessage({
        ...DEFAULT_INPUT,
        userMessage: 'Gracias',
      });

      // Avanzar el timer para cerrar la ventana de burst (3 segundos)
      await vi.advanceTimersByTimeAsync(3000);

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // El primer llamador recibe la respuesta procesada
      expect(result1).not.toBeNull();
      expect(result1!.conversationId).toBe('conv-flow-001');
      expect(result1!.messages.length).toBeGreaterThanOrEqual(1);

      // Los llamadores subsiguientes reciben null (mensaje buffered)
      expect(result2).toBeNull();
      expect(result3).toBeNull();

      // El mensaje persistido debe ser la concatenación de los 3 mensajes
      expect(processedMessages).toHaveLength(1);
      expect(processedMessages[0]).toContain('Hola');
      expect(processedMessages[0]).toContain('¿Cuál es el horario?');
      expect(processedMessages[0]).toContain('Gracias');
    });

    it('should process single message after burst window expires', async () => {
      let llmCallCount = 0;
      const deps = createMockDependencies({
        llmProvider: {
          generate: async () => {
            llmCallCount++;
            if (llmCallCount % 2 === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            return { content: 'Respuesta única.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
      });

      const service = createService(deps);

      const promise = service.receiveMessage({
        ...DEFAULT_INPUT,
        userMessage: 'Mensaje único',
      });

      // Avanzar el timer para cerrar la ventana
      await vi.advanceTimersByTimeAsync(3000);

      const result = await promise;

      expect(result).not.toBeNull();
      expect(result!.conversationId).toBe('conv-flow-001');
      expect(result!.escalated).toBe(false);
      expect(result!.messages[0].content).toBe('Respuesta única.');
    });
  });

  // ─── Flow 2.3: Acknowledgment Integration ─────────────────────────────────

  describe('Flow 2.3 - Acknowledgment Integration (Req 10.1)', () => {
    it('should trigger acknowledgment callback when processing exceeds threshold', async () => {
      vi.useRealTimers(); // Necesitamos timers reales para este test

      const acknowledgments: string[] = [];

      // LLM que tarda más que el threshold (configurado a 1 segundo para el test)
      let llmCallCount = 0;
      const deps = createMockDependencies({
        llmProvider: {
          generate: async () => {
            llmCallCount++;
            if (llmCallCount % 2 === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            // Simular procesamiento lento (mayor que el threshold)
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { content: 'Respuesta lenta.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
        agentConfigProvider: {
          getConfig: async () => ({
            ...AGENT_CONFIG,
            // Threshold muy bajo para que el ack se dispare rápido en el test
            acknowledgmentThreshold: 0.1,
            acknowledgmentMessage: 'Procesando tu consulta...',
          }),
        },
      });

      // Crear servicio con AcknowledgmentService real pero interceptar el callback
      const promptBuilder = new PromptBuilderService();
      const reRankingService = new ReRankingService(deps.llmProvider);
      const responseFormatter = new ResponseFormatterService();
      const burstDeduplication = new BurstDeduplicationService();
      const acknowledgmentService = new AcknowledgmentService();
      const escalationDetection = new EscalationDetectionService(
        deps.memoryService,
        deps.escalationEmitter,
      );

      // Espiar el método raceWithProcessing para capturar el callback
      const originalRace = acknowledgmentService.raceWithProcessing.bind(acknowledgmentService);
      acknowledgmentService.raceWithProcessing = async (promise, config, onAck) => {
        const wrappedOnAck = (message: string) => {
          acknowledgments.push(message);
          onAck(message);
        };
        return originalRace(promise, config, wrappedOnAck);
      };

      const service = new RagEngineService(
        deps.llmProvider,
        deps.vectorSearch,
        deps.memoryService,
        deps.agentConfigProvider,
        promptBuilder,
        reRankingService,
        responseFormatter,
        burstDeduplication,
        acknowledgmentService,
        escalationDetection,
      );

      const result = await service.processQuery(DEFAULT_INPUT);

      // El acknowledgment debe haberse disparado
      expect(acknowledgments).toHaveLength(1);
      expect(acknowledgments[0]).toBe('Procesando tu consulta...');

      // La respuesta final debe ser correcta
      expect(result.conversationId).toBe('conv-flow-001');
      expect(result.messages[0].content).toBe('Respuesta lenta.');
      expect(result.escalated).toBe(false);
    });

    it('should NOT trigger acknowledgment when processing completes before threshold', async () => {
      vi.useRealTimers();

      const acknowledgments: string[] = [];

      // LLM que responde rápido
      let llmCallCount = 0;
      const deps = createMockDependencies({
        llmProvider: {
          generate: async () => {
            llmCallCount++;
            if (llmCallCount % 2 === 1) {
              return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
            }
            // Respuesta inmediata
            return { content: 'Respuesta rápida.', tokensUsed: 10, finishReason: 'stop' };
          },
        },
        agentConfigProvider: {
          getConfig: async () => ({
            ...AGENT_CONFIG,
            // Threshold alto para que no se dispare
            acknowledgmentThreshold: 10,
          }),
        },
      });

      const promptBuilder = new PromptBuilderService();
      const reRankingService = new ReRankingService(deps.llmProvider);
      const responseFormatter = new ResponseFormatterService();
      const burstDeduplication = new BurstDeduplicationService();
      const acknowledgmentService = new AcknowledgmentService();
      const escalationDetection = new EscalationDetectionService(
        deps.memoryService,
        deps.escalationEmitter,
      );

      const originalRace = acknowledgmentService.raceWithProcessing.bind(acknowledgmentService);
      acknowledgmentService.raceWithProcessing = async (promise, config, onAck) => {
        const wrappedOnAck = (message: string) => {
          acknowledgments.push(message);
          onAck(message);
        };
        return originalRace(promise, config, wrappedOnAck);
      };

      const service = new RagEngineService(
        deps.llmProvider,
        deps.vectorSearch,
        deps.memoryService,
        deps.agentConfigProvider,
        promptBuilder,
        reRankingService,
        responseFormatter,
        burstDeduplication,
        acknowledgmentService,
        escalationDetection,
      );

      const result = await service.processQuery(DEFAULT_INPUT);

      // No debe haberse disparado el acknowledgment
      expect(acknowledgments).toHaveLength(0);

      // La respuesta debe ser correcta
      expect(result.messages[0].content).toBe('Respuesta rápida.');
    });
  });

  // ─── Flow 2.4: Escalation Detection Integration ───────────────────────────

  describe('Flow 2.4 - Escalation Detection Integration (Req 12.1, 12.4, 12.5)', () => {
    it('should escalate after N consecutive failed attempts (failedAttemptsBeforeEscalation)', async () => {
      const emitCalls: Array<{ conversationId: string; reason: string }> = [];
      const statusUpdates: Array<{ conversationId: string; status: string }> = [];

      const deps = createMockDependencies({
        // Vector search retorna resultados con score bajo (debajo del threshold)
        vectorSearch: {
          search: async () => [
            { fragmentId: 'frag-low', content: 'Contenido irrelevante', score: 0.3, metadata: {} },
          ],
        },
        memoryService: {
          getHistory: async () => [],
          saveMessage: async () => {},
          isNewSession: async () => false,
          getConversationStatus: async () => 'active',
          updateConversationStatus: async (conversationId, status) => {
            statusUpdates.push({ conversationId, status });
          },
        },
        escalationEmitter: {
          emit: async (event) => {
            emitCalls.push({ conversationId: event.conversationId, reason: event.reason });
            return true;
          },
        },
        agentConfigProvider: {
          getConfig: async () => ({
            ...AGENT_CONFIG,
            failedAttemptsBeforeEscalation: 3,
          }),
        },
      });

      const service = createService(deps);

      // Primer intento fallido — no escala
      const result1 = await service.processQuery(DEFAULT_INPUT);
      expect(result1.escalated).toBe(true);
      expect(result1.escalationReason).toBe(EscalationReason.LOW_RELEVANCE);

      // Segundo intento fallido — no escala
      const result2 = await service.processQuery(DEFAULT_INPUT);
      expect(result2.escalated).toBe(true);
      expect(result2.escalationReason).toBe(EscalationReason.LOW_RELEVANCE);

      // Tercer intento fallido — ESCALA con reason 'failed_attempts'
      const result3 = await service.processQuery(DEFAULT_INPUT);
      expect(result3.escalated).toBe(true);
      expect(result3.escalationReason).toBe(EscalationReason.FAILED_ATTEMPTS);
      expect(result3.messages[0].content).toBe('Te voy a comunicar con alguien del equipo...');

      // Verificar que EscalationEmitter.emit fue llamado con el evento correcto
      expect(emitCalls).toHaveLength(1);
      expect(emitCalls[0].conversationId).toBe('conv-flow-001');
      expect(emitCalls[0].reason).toBe(EscalationReason.FAILED_ATTEMPTS);

      // Verificar que el status de la conversación fue actualizado a 'escalated'
      expect(statusUpdates.some((u) => u.status === 'escalated')).toBe(true);
    });

    it('should emit EscalationEvent with correct fields when escalation is triggered', async () => {
      const emittedEvents: Array<{
        conversationId: string;
        agentId: string;
        companyId: string;
        reason: string;
        lastContext: string;
        timestamp: Date;
      }> = [];

      const deps = createMockDependencies({
        vectorSearch: {
          search: async () => [
            { fragmentId: 'frag-low', content: 'Irrelevante', score: 0.2, metadata: {} },
          ],
        },
        memoryService: {
          getHistory: async () => [],
          saveMessage: async () => {},
          isNewSession: async () => false,
          getConversationStatus: async () => 'active',
          updateConversationStatus: async () => {},
        },
        escalationEmitter: {
          emit: async (event) => {
            emittedEvents.push(event);
            return true;
          },
        },
        agentConfigProvider: {
          getConfig: async () => ({
            ...AGENT_CONFIG,
            failedAttemptsBeforeEscalation: 1, // Escalar al primer intento
          }),
        },
      });

      const service = createService(deps);
      await service.processQuery(DEFAULT_INPUT);

      // Verificar estructura completa del EscalationEvent
      expect(emittedEvents).toHaveLength(1);
      const event = emittedEvents[0];
      expect(event.conversationId).toBe('conv-flow-001');
      expect(event.agentId).toBe('agent-flow-001');
      expect(event.companyId).toBe('company-001');
      expect(event.reason).toBe(EscalationReason.FAILED_ATTEMPTS);
      expect(event.lastContext).toBeDefined();
      expect(event.lastContext.length).toBeLessThanOrEqual(500);
      expect(event.timestamp).toBeInstanceOf(Date);
    });
  });

  // ─── Escalated Conversation Behavior ───────────────────────────────────────

  describe('Escalated Conversation Behavior (Req 13.1, 13.2)', () => {
    it('should return transition message without processing when conversation is escalated', async () => {
      const savedMessages: Array<{ role: string; content: string }> = [];
      let llmCalled = false;
      let vectorSearchCalled = false;

      const deps = createMockDependencies({
        memoryService: {
          getHistory: async () => [],
          saveMessage: async (_, message) => {
            savedMessages.push({ role: message.role, content: message.content });
          },
          isNewSession: async () => false,
          getConversationStatus: async () => 'escalated',
          updateConversationStatus: async () => {},
        },
        llmProvider: {
          generate: async () => {
            llmCalled = true;
            return { content: 'No debería llamarse', tokensUsed: 0, finishReason: 'stop' };
          },
        },
        vectorSearch: {
          search: async () => {
            vectorSearchCalled = true;
            return [];
          },
        },
      });

      const service = createService(deps);
      const result = await service.processQuery(DEFAULT_INPUT);

      // Debe retornar el mensaje de transición
      expect(result.escalated).toBe(true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe(ResponseType.TEXT);
      expect(result.messages[0].content).toContain('Te voy a comunicar con alguien del equipo');

      // No debe haber procesado la consulta (no LLM, no vector search)
      expect(llmCalled).toBe(false);
      expect(vectorSearchCalled).toBe(false);

      // Debe haber preservado el mensaje del usuario en el historial
      expect(savedMessages).toHaveLength(1);
      expect(savedMessages[0].role).toBe('user');
      expect(savedMessages[0].content).toBe(DEFAULT_INPUT.userMessage);
    });

    it('should preserve user messages in history even when conversation is escalated', async () => {
      const savedMessages: Array<{ conversationId: string; content: string }> = [];

      const deps = createMockDependencies({
        memoryService: {
          getHistory: async () => [],
          saveMessage: async (conversationId, message) => {
            savedMessages.push({ conversationId, content: message.content });
          },
          isNewSession: async () => false,
          getConversationStatus: async () => 'escalated',
          updateConversationStatus: async () => {},
        },
      });

      const service = createService(deps);

      // Enviar múltiples mensajes a conversación escalada
      await service.processQuery({ ...DEFAULT_INPUT, userMessage: 'Primer mensaje' });
      await service.processQuery({ ...DEFAULT_INPUT, userMessage: 'Segundo mensaje' });
      await service.processQuery({ ...DEFAULT_INPUT, userMessage: 'Tercer mensaje' });

      // Todos los mensajes deben haberse preservado
      expect(savedMessages).toHaveLength(3);
      expect(savedMessages[0].content).toBe('Primer mensaje');
      expect(savedMessages[1].content).toBe('Segundo mensaje');
      expect(savedMessages[2].content).toBe('Tercer mensaje');
      expect(savedMessages.every((m) => m.conversationId === 'conv-flow-001')).toBe(true);
    });
  });

  // ─── Escalation Timeout ────────────────────────────────────────────────────

  describe('Escalation Timeout (Req 12.7, 13.2)', () => {
    it('should resume conversation by updating status to active after escalation timeout', async () => {
      const statusUpdates: Array<{ conversationId: string; status: string }> = [];
      let currentStatus: ConversationStatus = 'active';

      const deps = createMockDependencies({
        vectorSearch: {
          search: async () => [
            { fragmentId: 'frag-low', content: 'Irrelevante', score: 0.2, metadata: {} },
          ],
        },
        memoryService: {
          getHistory: async () => [],
          saveMessage: async () => {},
          isNewSession: async () => false,
          getConversationStatus: async () => currentStatus,
          updateConversationStatus: async (conversationId, status) => {
            currentStatus = status;
            statusUpdates.push({ conversationId, status });
          },
        },
        escalationEmitter: {
          emit: async () => true,
        },
        agentConfigProvider: {
          getConfig: async () => ({
            ...AGENT_CONFIG,
            failedAttemptsBeforeEscalation: 1, // Escalar al primer intento
            escalationTimeout: 15, // 15 minutos
          }),
        },
      });

      const service = createService(deps);

      // Disparar escalamiento
      const result = await service.processQuery(DEFAULT_INPUT);
      expect(result.escalated).toBe(true);
      expect(result.escalationReason).toBe(EscalationReason.FAILED_ATTEMPTS);

      // Verificar que el status cambió a 'escalated'
      expect(currentStatus).toBe('escalated');

      // Avanzar el timer por el timeout de escalamiento (15 minutos = 900000 ms)
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

      // Verificar que updateConversationStatus fue llamado con 'active' (retoma)
      const activeUpdates = statusUpdates.filter((u) => u.status === 'active');
      expect(activeUpdates.length).toBeGreaterThanOrEqual(1);
      expect(currentStatus).toBe('active');
    });

    it('should not update status if conversation was already resolved before timeout', async () => {
      const statusUpdates: Array<{ conversationId: string; status: string }> = [];
      let currentStatus: ConversationStatus = 'active';

      const deps = createMockDependencies({
        vectorSearch: {
          search: async () => [
            { fragmentId: 'frag-low', content: 'Irrelevante', score: 0.2, metadata: {} },
          ],
        },
        memoryService: {
          getHistory: async () => [],
          saveMessage: async () => {},
          isNewSession: async () => false,
          getConversationStatus: async () => currentStatus,
          updateConversationStatus: async (conversationId, status) => {
            currentStatus = status;
            statusUpdates.push({ conversationId, status });
          },
        },
        escalationEmitter: {
          emit: async () => true,
        },
        agentConfigProvider: {
          getConfig: async () => ({
            ...AGENT_CONFIG,
            failedAttemptsBeforeEscalation: 1,
            escalationTimeout: 15,
          }),
        },
      });

      const service = createService(deps);

      // Disparar escalamiento
      await service.processQuery(DEFAULT_INPUT);
      expect(currentStatus).toBe('escalated');

      // Simular que un humano atendió y cambió el status a 'active' antes del timeout
      currentStatus = 'active';

      // Avanzar el timer por el timeout
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

      // El handleEscalationTimeout verifica el status actual.
      // Como ya es 'active', no debe llamar updateConversationStatus de nuevo.
      // Solo debe haber las actualizaciones del escalamiento original + la que hicimos manualmente
      const activeUpdatesAfterTimeout = statusUpdates.filter(
        (u) => u.status === 'active',
      );
      // No debe haber una actualización adicional a 'active' por el timeout
      // porque getConversationStatus retorna 'active' (ya fue atendida)
      expect(activeUpdatesAfterTimeout).toHaveLength(0);
    });
  });
});
