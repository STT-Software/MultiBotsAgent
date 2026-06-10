import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RagEngineService } from '../rag-engine.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { ReRankingService } from '../services/re-ranking.service';
import { ResponseFormatterService } from '../services/response-formatter.service';
import { InvalidInputException } from '../exceptions/rag-engine.exceptions';
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
  SearchResult,
  VectorSearchService,
} from '@multibotagents/types';

/**
 * Property 1: Input validation rejects invalid inputs
 * Property 7: LLM failure produces escalated output
 * Property 9: No-info response structure
 * Property 10: Graceful degradation on service failures
 * Property 11: Welcome message ordering on new sessions
 * Property 12: Output structure invariants
 *
 * **Validates: Requirements 1.2, 1.3, 2.2, 6.3, 7.1, 7.2, 8.3, 9.2, 11.1, 11.2**
 */

// ─── Generators ──────────────────────────────────────────────────────────────

const agentConfigArb = fc.record({
  agentId: fc.uuid(),
  companyId: fc.uuid(),
  personality: fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    tone: fc.string({ minLength: 1, maxLength: 50 }),
    restrictions: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 3 }),
    instructions: fc.string({ minLength: 1, maxLength: 200 }),
  }),
  relevanceThreshold: fc.float({ min: 0, max: 1, noNaN: true }),
  topK: fc.integer({ min: 1, max: 10 }),
  maxResponseLength: fc.integer({ min: 100, max: 5000 }),
  memoryWindow: fc.integer({ min: 1, max: 20 }),
  welcomeMessage: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  failedAttemptsBeforeEscalation: fc.integer({ min: 1, max: 10 }),
  noInfoMessage: fc.string({ minLength: 1, maxLength: 200 }),
  errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
  language: fc.constantFrom('es', 'en', 'pt'),
});

const validInputArb = fc.record({
  agentId: fc.uuid(),
  conversationId: fc.uuid(),
  userMessage: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  timestamp: fc.date(),
});

const searchResultArb = fc.record({
  fragmentId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  score: fc.float({ min: 0, max: 1, noNaN: true }),
  metadata: fc.constant({} as Record<string, unknown>),
});

const errorArb = fc.oneof(
  fc.constant(new Error('Timeout')),
  fc.constant(new Error('Service unavailable')),
  fc.constant(new Error('Network error')),
  fc.constant(new Error('Internal server error')),
  fc.string({ minLength: 1, maxLength: 100 }).map(msg => new Error(msg)),
);

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
      content: 'Test response from LLM',
      tokensUsed: 10,
      finishReason: 'stop',
    }),
  };

  const mockVectorSearch: VectorSearchService = {
    search: async () => [
      { fragmentId: '1', content: 'relevant content', score: 0.95, metadata: {} },
    ],
  };

  const mockMemoryService: MemoryService = {
    getHistory: async () => [],
    saveMessage: async () => {},
    isNewSession: async () => false,
  };

  const mockAgentConfigProvider: AgentConfigProvider = {
    getConfig: async () => ({
      agentId: 'test-agent',
      companyId: '507f1f77bcf86cd799439011',
      personality: { name: 'Test', tone: 'friendly', restrictions: [], instructions: 'Be helpful' },
      relevanceThreshold: 0.7,
      topK: 5,
      maxResponseLength: 1000,
      memoryWindow: 10,
      welcomeMessage: undefined,
      failedAttemptsBeforeEscalation: 3,
      noInfoMessage: 'No tengo información sobre eso',
      errorMessage: 'Hubo un problema procesando tu consulta',
      language: 'es',
    }),
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
  // Create real internal services with the mock LLM for re-ranking
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

// ─── Property 1: Input validation rejects invalid inputs ─────────────────────

describe('Feature: rag-agent-engine, Property 1: Input validation rejects invalid inputs', () => {
  it('empty or whitespace-only userMessage throws InvalidInputException', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', '   ', '\t', '\n', '  \n\t  '),
        fc.uuid(),
        fc.uuid(),
        fc.date(),
        async (invalidMessage: string, agentId: string, conversationId: string, timestamp: Date) => {
          const deps = createMockDependencies();
          const service = createService(deps);

          const input: RagProcessInput = {
            agentId,
            conversationId,
            userMessage: invalidMessage,
            timestamp,
          };

          await expect(service.processQuery(input)).rejects.toThrow(InvalidInputException);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('invalid inputs do not trigger downstream services', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', '   ', '\t', '\n'),
        fc.uuid(),
        fc.uuid(),
        fc.date(),
        async (invalidMessage: string, agentId: string, conversationId: string, timestamp: Date) => {
          let vectorSearchCalled = false;
          let llmCalled = false;

          const deps = createMockDependencies({
            vectorSearch: {
              search: async () => {
                vectorSearchCalled = true;
                return [];
              },
            },
            llmProvider: {
              generate: async () => {
                llmCalled = true;
                return { content: 'test', tokensUsed: 5, finishReason: 'stop' };
              },
            },
          });
          const service = createService(deps);

          const input: RagProcessInput = {
            agentId,
            conversationId,
            userMessage: invalidMessage,
            timestamp,
          };

          try {
            await service.processQuery(input);
          } catch {
            // Expected to throw
          }

          expect(vectorSearchCalled).toBe(false);
          expect(llmCalled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: LLM failure produces escalated output ───────────────────────

describe('Feature: rag-agent-engine, Property 7: LLM failure produces escalated output', () => {
  it('any error from LlmProvider.generate produces escalated=true with llm_unavailable reason', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb,
        errorArb,
        async (input: RagProcessInput, config: AgentConfig, error: Error) => {
          // LLM for re-ranking returns valid indices, but main generate throws
          let callCount = 0;
          const deps = createMockDependencies({
            llmProvider: {
              generate: async () => {
                callCount++;
                // First call is re-ranking, let it succeed
                if (callCount === 1) {
                  return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
                }
                // Second call is the main LLM invocation, throw error
                throw error;
              },
            },
            vectorSearch: {
              search: async () => [
                { fragmentId: '1', content: 'test content', score: config.relevanceThreshold + 0.1, metadata: {} },
              ],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          expect(result.escalated).toBe(true);
          expect(result.escalationReason).toBe(EscalationReason.LLM_UNAVAILABLE);
          expect(result.messages.length).toBeGreaterThan(0);
          expect(result.messages.some(m => m.content === config.errorMessage)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 9: No-info response structure ─────────────────────────────────

describe('Feature: rag-agent-engine, Property 9: No-info response structure', () => {
  it('when no fragments pass threshold, output contains noInfoMessage and escalated=true with low_relevance', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb.map(c => ({ ...c, relevanceThreshold: Math.max(c.relevanceThreshold, 0.2) })),
        fc.array(searchResultArb, { minLength: 1, maxLength: 10 }),
        async (input: RagProcessInput, config: AgentConfig, fragments: SearchResult[]) => {
          // Ensure all fragments have scores strictly BELOW the threshold
          const lowScoreFragments = fragments.map(f => ({
            ...f,
            score: config.relevanceThreshold * 0.5,
          }));

          const deps = createMockDependencies({
            vectorSearch: {
              search: async () => lowScoreFragments,
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
            llmProvider: {
              generate: async () => ({ content: 'NO_INFO', tokensUsed: 5, finishReason: 'stop' }),
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          expect(result.escalated).toBe(true);
          expect(result.escalationReason).toBe(EscalationReason.LOW_RELEVANCE);
          expect(result.messages.length).toBeGreaterThan(0);
          expect(result.messages.some(m => m.content === config.noInfoMessage)).toBe(true);
          expect(result.conversationId).toBe(input.conversationId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when vector search returns empty results, output contains noInfoMessage and escalated=true', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb,
        async (input: RagProcessInput, config: AgentConfig) => {
          const deps = createMockDependencies({
            vectorSearch: {
              search: async () => [],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
            llmProvider: {
              generate: async () => ({ content: 'NO_INFO', tokensUsed: 5, finishReason: 'stop' }),
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          expect(result.escalated).toBe(true);
          expect(result.escalationReason).toBe(EscalationReason.LOW_RELEVANCE);
          expect(result.messages.some(m => m.content === config.noInfoMessage)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 10: Graceful degradation on service failures ───────────────────

describe('Feature: rag-agent-engine, Property 10: Graceful degradation on service failures', () => {
  it('when MemoryService.getHistory throws, processQuery still returns a valid RagProcessOutput', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb,
        errorArb,
        async (input: RagProcessInput, config: AgentConfig, error: Error) => {
          const deps = createMockDependencies({
            memoryService: {
              getHistory: async () => { throw error; },
              saveMessage: async () => {},
              isNewSession: async () => false,
            },
            vectorSearch: {
              search: async () => [
                { fragmentId: '1', content: 'test', score: config.relevanceThreshold + 0.1, metadata: {} },
              ],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
            llmProvider: {
              generate: async () => ({
                content: JSON.stringify([0]),
                tokensUsed: 10,
                finishReason: 'stop',
              }),
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          // Should NOT throw, should return valid output
          expect(result).toBeDefined();
          expect(result.conversationId).toBe(input.conversationId);
          expect(result.messages).toBeInstanceOf(Array);
          expect(typeof result.escalated).toBe('boolean');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when MemoryService.saveMessage throws, processQuery still returns a valid response', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb,
        errorArb,
        async (input: RagProcessInput, config: AgentConfig, error: Error) => {
          const deps = createMockDependencies({
            memoryService: {
              getHistory: async () => [],
              saveMessage: async () => { throw error; },
              isNewSession: async () => false,
            },
            vectorSearch: {
              search: async () => [
                { fragmentId: '1', content: 'test', score: config.relevanceThreshold + 0.1, metadata: {} },
              ],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
            llmProvider: {
              generate: async () => ({
                content: JSON.stringify([0]),
                tokensUsed: 10,
                finishReason: 'stop',
              }),
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          expect(result).toBeDefined();
          expect(result.conversationId).toBe(input.conversationId);
          expect(result.messages).toBeInstanceOf(Array);
          expect(typeof result.escalated).toBe('boolean');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when MemoryService.isNewSession throws, processQuery still returns a valid response', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb,
        errorArb,
        async (input: RagProcessInput, config: AgentConfig, error: Error) => {
          const deps = createMockDependencies({
            memoryService: {
              getHistory: async () => [],
              saveMessage: async () => {},
              isNewSession: async () => { throw error; },
            },
            vectorSearch: {
              search: async () => [
                { fragmentId: '1', content: 'test', score: config.relevanceThreshold + 0.1, metadata: {} },
              ],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
            llmProvider: {
              generate: async () => ({
                content: JSON.stringify([0]),
                tokensUsed: 10,
                finishReason: 'stop',
              }),
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          expect(result).toBeDefined();
          expect(result.conversationId).toBe(input.conversationId);
          expect(result.messages).toBeInstanceOf(Array);
          expect(typeof result.escalated).toBe('boolean');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: Welcome message ordering on new sessions ───────────────────

describe('Feature: rag-agent-engine, Property 11: Welcome message ordering on new sessions', () => {
  it('when isNewSession=true and config has welcomeMessage, first message is the welcome message', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb.filter(c => c.welcomeMessage !== undefined && c.welcomeMessage.length > 0),
        async (input: RagProcessInput, config: AgentConfig) => {
          const deps = createMockDependencies({
            memoryService: {
              getHistory: async () => [],
              saveMessage: async () => {},
              isNewSession: async () => true,
            },
            vectorSearch: {
              search: async () => [
                { fragmentId: '1', content: 'test', score: config.relevanceThreshold + 0.1, metadata: {} },
              ],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
            llmProvider: {
              generate: async () => ({
                content: JSON.stringify([0]),
                tokensUsed: 10,
                finishReason: 'stop',
              }),
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          // First message must be the welcome message
          expect(result.messages.length).toBeGreaterThanOrEqual(2);
          expect(result.messages[0].type).toBe(ResponseType.TEXT);
          expect(result.messages[0].content).toBe(config.welcomeMessage);

          // Subsequent messages are the query response
          expect(result.messages.slice(1).length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when isNewSession=false, welcome message is NOT prepended', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb.filter(c => c.welcomeMessage !== undefined && c.welcomeMessage.length > 0),
        async (input: RagProcessInput, config: AgentConfig) => {
          const deps = createMockDependencies({
            memoryService: {
              getHistory: async () => [],
              saveMessage: async () => {},
              isNewSession: async () => false,
            },
            vectorSearch: {
              search: async () => [
                { fragmentId: '1', content: 'test', score: config.relevanceThreshold + 0.1, metadata: {} },
              ],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
            llmProvider: {
              generate: async () => ({
                content: JSON.stringify([0]),
                tokensUsed: 10,
                finishReason: 'stop',
              }),
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          // First message should NOT be the welcome message
          if (result.messages.length > 0) {
            expect(result.messages[0].content).not.toBe(config.welcomeMessage);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: Output structure invariants ────────────────────────────────

describe('Feature: rag-agent-engine, Property 12: Output structure invariants', () => {
  it('successful processing: escalated=false, no escalationReason, correct conversationId, non-empty messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb,
        async (input: RagProcessInput, config: AgentConfig) => {
          const deps = createMockDependencies({
            vectorSearch: {
              search: async () => [
                { fragmentId: '1', content: 'test', score: config.relevanceThreshold + 0.1, metadata: {} },
              ],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
            llmProvider: {
              generate: async () => ({
                content: JSON.stringify([0]),
                tokensUsed: 10,
                finishReason: 'stop',
              }),
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          expect(result.escalated).toBe(false);
          expect(result.escalationReason).toBeUndefined();
          expect(result.conversationId).toBe(input.conversationId);
          expect(result.messages.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('escalated processing (LLM failure): escalated=true, valid escalationReason, non-empty messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb,
        async (input: RagProcessInput, config: AgentConfig) => {
          let callCount = 0;
          const deps = createMockDependencies({
            llmProvider: {
              generate: async () => {
                callCount++;
                if (callCount === 1) {
                  return { content: '[0]', tokensUsed: 5, finishReason: 'stop' };
                }
                throw new Error('LLM unavailable');
              },
            },
            vectorSearch: {
              search: async () => [
                { fragmentId: '1', content: 'test', score: config.relevanceThreshold + 0.1, metadata: {} },
              ],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          expect(result.escalated).toBe(true);
          expect(result.escalationReason).toBeDefined();
          expect([
            EscalationReason.LOW_RELEVANCE,
            EscalationReason.LLM_UNAVAILABLE,
            EscalationReason.USER_REQUEST,
            EscalationReason.FAILED_ATTEMPTS,
            EscalationReason.LLM_UNCERTAINTY,
          ]).toContain(result.escalationReason);
          expect(result.messages.length).toBeGreaterThan(0);
          expect(result.conversationId).toBe(input.conversationId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('escalated processing (no info): escalated=true, valid escalationReason, non-empty messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        validInputArb,
        agentConfigArb,
        async (input: RagProcessInput, config: AgentConfig) => {
          const deps = createMockDependencies({
            vectorSearch: {
              search: async () => [],
            },
            agentConfigProvider: {
              getConfig: async () => config,
            },
            llmProvider: {
              generate: async () => ({ content: 'NO_INFO', tokensUsed: 5, finishReason: 'stop' }),
            },
          });

          const service = createService(deps);
          const result = await service.processQuery(input);

          expect(result.escalated).toBe(true);
          expect(result.escalationReason).toBeDefined();
          expect([
            EscalationReason.LOW_RELEVANCE,
            EscalationReason.LLM_UNAVAILABLE,
            EscalationReason.USER_REQUEST,
            EscalationReason.FAILED_ATTEMPTS,
            EscalationReason.LLM_UNCERTAINTY,
          ]).toContain(result.escalationReason);
          expect(result.messages.length).toBeGreaterThan(0);
          expect(result.conversationId).toBe(input.conversationId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
