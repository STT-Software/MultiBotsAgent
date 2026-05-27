import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { EscalationReason } from '@multibotagents/types';
import { EscalationDetectionService } from '../services/escalation-detection.service';

/**
 * Property 15: Escalation detection by failed attempts
 * Property 16: Post-escalation message preservation
 * Property 17: Escalation timeout triggers conversation resumption
 *
 * Validates: Requirements 12.1, 13.1, 13.2, 13.4
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

function createMockMemoryService() {
  return {
    getHistory: vi.fn(),
    saveMessage: vi.fn(),
    isNewSession: vi.fn(),
    getConversationStatus: vi.fn().mockResolvedValue('active'),
    updateConversationStatus: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockEscalationEmitter() {
  return {
    emit: vi.fn().mockResolvedValue(true),
  };
}

// ─── Generators ──────────────────────────────────────────────────────────────

const thresholdArb = fc.integer({ min: 1, max: 10 });
const conversationIdArb = fc.uuid();

const agentConfigArb = (threshold: number) =>
  fc.record({
    agentId: fc.uuid(),
    companyId: fc.uuid(),
    personality: fc.constant({ name: 'Bot', tone: 'amigable', restrictions: [], instructions: '' }),
    relevanceThreshold: fc.constant(0.7),
    topK: fc.constant(5),
    maxResponseLength: fc.constant(1000),
    memoryWindow: fc.constant(10),
    failedAttemptsBeforeEscalation: fc.constant(threshold),
    noInfoMessage: fc.constant('No tengo información sobre eso'),
    errorMessage: fc.constant('Hubo un problema'),
    escalationOfferMessage: fc.constant('¿Deseas hablar con un humano?'),
    escalationTransitionMessage: fc.constant('Te comunico con un agente...'),
    escalationReturnMessage: fc.constant('No pude comunicarte. ¿Puedo ayudarte?'),
    acknowledgmentMessage: fc.constant('Un momento...'),
    acknowledgmentThreshold: fc.constant(5),
    burstWindow: fc.constant(3),
    escalationTimeout: fc.integer({ min: 5, max: 60 }),
    language: fc.constant('es'),
  });

describe('Feature: rag-agent-engine, Properties 15, 16, 17: EscalationDetectionService', () => {
  let mockMemoryService: ReturnType<typeof createMockMemoryService>;
  let mockEscalationEmitter: ReturnType<typeof createMockEscalationEmitter>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockMemoryService = createMockMemoryService();
    mockEscalationEmitter = createMockEscalationEmitter();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── Property 15: Escalation detection by failed attempts ────────────────

  describe('Property 15: N failed attempts >= threshold triggers escalation with reason "failed_attempts"', () => {
    /**
     * **Validates: Requirements 12.1**
     *
     * For any threshold (1-10), calling recordNoInfoAttempt exactly threshold times
     * SHALL trigger escalation with reason "failed_attempts".
     */
    it('N consecutive failed attempts >= threshold triggers escalation', async () => {
      await fc.assert(
        fc.asyncProperty(
          thresholdArb,
          conversationIdArb,
          agentConfigArb(3).chain(config =>
            fc.constant(config).map(c => ({ ...c })),
          ),
          async (threshold, conversationId, baseConfig) => {
            const config = { ...baseConfig, failedAttemptsBeforeEscalation: threshold };
            mockMemoryService = createMockMemoryService();
            mockEscalationEmitter = createMockEscalationEmitter();
            const service = new EscalationDetectionService(
              mockMemoryService as any,
              mockEscalationEmitter as any,
            );

            let result = null;

            // Call recordNoInfoAttempt threshold times
            for (let i = 0; i < threshold; i++) {
              result = await service.recordNoInfoAttempt(conversationId, config as any);
            }

            // The last call should trigger escalation
            expect(result).not.toBeNull();
            expect(result!.escalated).toBe(true);
            expect(result!.reason).toBe(EscalationReason.FAILED_ATTEMPTS);

            // Verify memoryService.updateConversationStatus was called with 'escalated'
            expect(mockMemoryService.updateConversationStatus).toHaveBeenCalledWith(
              conversationId,
              'escalated',
            );

            // Verify escalationEmitter.emit was called with correct event
            expect(mockEscalationEmitter.emit).toHaveBeenCalledWith(
              expect.objectContaining({
                conversationId,
                agentId: config.agentId,
                companyId: config.companyId,
                reason: EscalationReason.FAILED_ATTEMPTS,
              }),
            );
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * **Validates: Requirements 12.1**
     *
     * For any threshold (2-10), calling recordNoInfoAttempt (threshold - 1) times
     * SHALL NOT trigger escalation (all calls return null).
     */
    it('N failed attempts < threshold does NOT trigger escalation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }),
          conversationIdArb,
          agentConfigArb(3).chain(config =>
            fc.constant(config).map(c => ({ ...c })),
          ),
          async (threshold, conversationId, baseConfig) => {
            const config = { ...baseConfig, failedAttemptsBeforeEscalation: threshold };
            mockMemoryService = createMockMemoryService();
            mockEscalationEmitter = createMockEscalationEmitter();
            const service = new EscalationDetectionService(
              mockMemoryService as any,
              mockEscalationEmitter as any,
            );

            // Call recordNoInfoAttempt (threshold - 1) times
            for (let i = 0; i < threshold - 1; i++) {
              const result = await service.recordNoInfoAttempt(conversationId, config as any);
              expect(result).toBeNull();
            }

            // Verify escalation was never triggered
            expect(mockEscalationEmitter.emit).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * **Validates: Requirements 12.1**
     *
     * Calling resetFailedAttempts resets the counter to zero.
     * After reset, (threshold - 1) more attempts SHALL NOT trigger escalation.
     */
    it('successful response resets counter to zero', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }),
          fc.integer({ min: 1, max: 9 }),
          conversationIdArb,
          agentConfigArb(3).chain(config =>
            fc.constant(config).map(c => ({ ...c })),
          ),
          async (threshold, attemptsBeforeReset, conversationId, baseConfig) => {
            // Ensure attemptsBeforeReset < threshold
            const actualAttemptsBefore = Math.min(attemptsBeforeReset, threshold - 1);
            const config = { ...baseConfig, failedAttemptsBeforeEscalation: threshold };
            mockMemoryService = createMockMemoryService();
            mockEscalationEmitter = createMockEscalationEmitter();
            const service = new EscalationDetectionService(
              mockMemoryService as any,
              mockEscalationEmitter as any,
            );

            // Accumulate some failed attempts (< threshold)
            for (let i = 0; i < actualAttemptsBefore; i++) {
              await service.recordNoInfoAttempt(conversationId, config as any);
            }

            // Reset counter (simulates successful response)
            service.resetFailedAttempts(conversationId);

            // After reset, (threshold - 1) more attempts should NOT trigger escalation
            for (let i = 0; i < threshold - 1; i++) {
              const result = await service.recordNoInfoAttempt(conversationId, config as any);
              expect(result).toBeNull();
            }

            // Verify escalation was never triggered
            expect(mockEscalationEmitter.emit).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  // ─── Property 16: Post-escalation message preservation ───────────────────

  describe('Property 16: evaluateResponse detects escalation conditions', () => {
    /**
     * **Validates: Requirements 13.1**
     *
     * evaluateResponse with uncertaintyIndicator=true SHALL trigger escalation
     * with reason 'llm_uncertainty'.
     */
    it('evaluateResponse with uncertaintyIndicator=true triggers escalation', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationIdArb,
          fc.string({ minLength: 1, maxLength: 200 }),
          agentConfigArb(3),
          async (conversationId, userMessage, config) => {
            mockMemoryService = createMockMemoryService();
            mockEscalationEmitter = createMockEscalationEmitter();
            const service = new EscalationDetectionService(
              mockMemoryService as any,
              mockEscalationEmitter as any,
            );

            const llmResponse = {
              content: 'No estoy seguro de la respuesta',
              tokensUsed: 50,
              finishReason: 'stop' as const,
              uncertaintyIndicator: true,
            };

            const result = await service.evaluateResponse(
              conversationId,
              llmResponse,
              userMessage,
              config as any,
            );

            expect(result).not.toBeNull();
            expect(result!.escalated).toBe(true);
            expect(result!.reason).toBe(EscalationReason.LLM_UNCERTAINTY);

            // Verify status was changed to escalated
            expect(mockMemoryService.updateConversationStatus).toHaveBeenCalledWith(
              conversationId,
              'escalated',
            );
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * **Validates: Requirements 13.1, 13.2**
     *
     * evaluateResponse with user escalation request pattern SHALL trigger
     * escalation with reason 'user_request'.
     */
    it('evaluateResponse with user escalation request triggers escalation', async () => {
      const escalationPatterns = [
        'quiero hablar con humano',
        'hablar con alguien',
        'agente real',
        'persona real',
        'quiero un humano',
        'operador',
        'asesor real',
      ];

      await fc.assert(
        fc.asyncProperty(
          conversationIdArb,
          fc.constantFrom(...escalationPatterns),
          agentConfigArb(3),
          async (conversationId, pattern, config) => {
            mockMemoryService = createMockMemoryService();
            mockEscalationEmitter = createMockEscalationEmitter();
            const service = new EscalationDetectionService(
              mockMemoryService as any,
              mockEscalationEmitter as any,
            );

            const llmResponse = {
              content: 'Respuesta normal',
              tokensUsed: 30,
              finishReason: 'stop' as const,
              uncertaintyIndicator: false,
            };

            // Message containing escalation pattern
            const userMessage = `Hola, ${pattern} por favor`;

            const result = await service.evaluateResponse(
              conversationId,
              llmResponse,
              userMessage,
              config as any,
            );

            expect(result).not.toBeNull();
            expect(result!.escalated).toBe(true);
            expect(result!.reason).toBe(EscalationReason.USER_REQUEST);

            // Verify status was changed to escalated
            expect(mockMemoryService.updateConversationStatus).toHaveBeenCalledWith(
              conversationId,
              'escalated',
            );
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  // ─── Property 17: Escalation timeout triggers conversation resumption ────

  describe('Property 17: Escalation timeout triggers conversation resumption', () => {
    /**
     * **Validates: Requirements 13.4**
     *
     * After escalation, when the escalationTimeout expires,
     * the conversation status SHALL be changed back to "active".
     */
    it('escalation timeout changes status back to active', async () => {
      await fc.assert(
        fc.asyncProperty(
          thresholdArb,
          conversationIdArb,
          agentConfigArb(3).chain(config =>
            fc.constant(config).map(c => ({ ...c })),
          ),
          async (threshold, conversationId, baseConfig) => {
            const config = { ...baseConfig, failedAttemptsBeforeEscalation: threshold };
            mockMemoryService = createMockMemoryService();
            mockEscalationEmitter = createMockEscalationEmitter();

            // After escalation, getConversationStatus should return 'escalated'
            mockMemoryService.getConversationStatus.mockResolvedValue('escalated');

            const service = new EscalationDetectionService(
              mockMemoryService as any,
              mockEscalationEmitter as any,
            );

            // Trigger escalation by reaching threshold
            for (let i = 0; i < threshold; i++) {
              await service.recordNoInfoAttempt(conversationId, config as any);
            }

            // Clear mock calls to isolate timeout behavior
            mockMemoryService.updateConversationStatus.mockClear();

            // Advance timers by escalationTimeout minutes
            const timeoutMs = config.escalationTimeout * 60 * 1000;
            await vi.advanceTimersByTimeAsync(timeoutMs);

            // Verify updateConversationStatus was called with 'active'
            expect(mockMemoryService.updateConversationStatus).toHaveBeenCalledWith(
              conversationId,
              'active',
            );
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  // ─── Property: Graceful degradation when emit fails ──────────────────────

  describe('Property: If emit fails, status reverts to active (graceful degradation)', () => {
    /**
     * **Validates: Requirements 13.1, 13.2**
     *
     * If escalationEmitter.emit returns false, the service SHALL revert
     * the conversation status to "active" and return escalated=false.
     */
    it('emit failure reverts status to active and returns escalated=false', async () => {
      await fc.assert(
        fc.asyncProperty(
          thresholdArb,
          conversationIdArb,
          agentConfigArb(3).chain(config =>
            fc.constant(config).map(c => ({ ...c })),
          ),
          async (threshold, conversationId, baseConfig) => {
            const config = { ...baseConfig, failedAttemptsBeforeEscalation: threshold };
            mockMemoryService = createMockMemoryService();
            mockEscalationEmitter = createMockEscalationEmitter();

            // Mock emit to return false (failure)
            mockEscalationEmitter.emit.mockResolvedValue(false);

            const service = new EscalationDetectionService(
              mockMemoryService as any,
              mockEscalationEmitter as any,
            );

            // Trigger escalation by reaching threshold
            let result = null;
            for (let i = 0; i < threshold; i++) {
              result = await service.recordNoInfoAttempt(conversationId, config as any);
            }

            // Result should indicate escalation failed (graceful degradation)
            expect(result).not.toBeNull();
            expect(result!.escalated).toBe(false);
            expect(result!.reason).toBe(EscalationReason.FAILED_ATTEMPTS);

            // Verify status was first set to 'escalated' then reverted to 'active'
            expect(mockMemoryService.updateConversationStatus).toHaveBeenCalledWith(
              conversationId,
              'escalated',
            );
            expect(mockMemoryService.updateConversationStatus).toHaveBeenCalledWith(
              conversationId,
              'active',
            );
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
