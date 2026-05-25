import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildFullPrompt, buildSystemPrompt, buildContextSection } from '../prompt-building';
import { AgentConfig, SearchResult, HistoryMessage } from '@multibotagents/types';

/**
 * Property 5: Prompt construction invariants
 *
 * For any valid AgentConfig, validated fragments, history, and user message,
 * the constructed prompt SHALL:
 * (a) contain the system prompt with personality name, tone, restrictions, and instructions
 * (b) contain the validated fragments as context
 * (c) contain the history messages
 * (d) contain the user message
 * (e) maintain the order: system prompt → context → history → user message
 * (f) include an explicit anti-hallucination instruction
 * (g) include the maxResponseLength constraint
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 */

const personalityConfigArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  tone: fc.string({ minLength: 1, maxLength: 50 }),
  restrictions: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 5 }),
  instructions: fc.string({ minLength: 1, maxLength: 500 }),
});

const agentConfigArb = fc.record({
  agentId: fc.uuid(),
  companyId: fc.uuid(),
  personality: personalityConfigArb,
  relevanceThreshold: fc.float({ min: 0, max: 1, noNaN: true }),
  topK: fc.integer({ min: 1, max: 20 }),
  maxResponseLength: fc.integer({ min: 100, max: 5000 }),
  memoryWindow: fc.integer({ min: 1, max: 50 }),
  welcomeMessage: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  failedAttemptsBeforeEscalation: fc.integer({ min: 1, max: 10 }),
  noInfoMessage: fc.string({ minLength: 1, maxLength: 200 }),
  errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
  language: fc.constantFrom('es', 'en', 'pt'),
});

const searchResultArb = fc.record({
  fragmentId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  score: fc.float({ min: 0, max: 1, noNaN: true }),
  metadata: fc.constant({} as Record<string, unknown>),
});

const historyMessageArb = fc.record({
  role: fc.constantFrom('user' as const, 'assistant' as const),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.date(),
});

describe('Feature: rag-agent-engine, Property 5: Prompt construction invariants', () => {
  it('system prompt contains personality name, tone, restrictions, and instructions', () => {
    fc.assert(
      fc.property(
        agentConfigArb,
        (config: AgentConfig) => {
          const systemPrompt = buildSystemPrompt(config.personality, config.language);

          expect(systemPrompt).toContain(config.personality.name);
          expect(systemPrompt).toContain(config.personality.tone);

          for (const restriction of config.personality.restrictions) {
            expect(systemPrompt).toContain(restriction);
          }

          expect(systemPrompt).toContain(config.personality.instructions);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('context section contains all fragment contents', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArb, { minLength: 1, maxLength: 10 }),
        (fragments: SearchResult[]) => {
          const context = buildContextSection(fragments);

          for (const fragment of fragments) {
            expect(context).toContain(fragment.content);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('LlmPrompt.history equals the input history', () => {
    fc.assert(
      fc.property(
        agentConfigArb,
        fc.array(searchResultArb, { minLength: 0, maxLength: 10 }),
        fc.array(historyMessageArb, { minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (config: AgentConfig, fragments: SearchResult[], history: HistoryMessage[], userMessage: string) => {
          const prompt = buildFullPrompt({ config, fragments, history, userMessage });

          expect(prompt.history).toEqual(history);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('LlmPrompt.userMessage equals the input userMessage', () => {
    fc.assert(
      fc.property(
        agentConfigArb,
        fc.array(searchResultArb, { minLength: 0, maxLength: 10 }),
        fc.array(historyMessageArb, { minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (config: AgentConfig, fragments: SearchResult[], history: HistoryMessage[], userMessage: string) => {
          const prompt = buildFullPrompt({ config, fragments, history, userMessage });

          expect(prompt.userMessage).toBe(userMessage);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('system prompt includes anti-hallucination instruction', () => {
    fc.assert(
      fc.property(
        agentConfigArb,
        (config: AgentConfig) => {
          const systemPrompt = buildSystemPrompt(config.personality, config.language);

          expect(systemPrompt).toContain(
            'No generes información que no esté respaldada por el contexto proporcionado',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('full prompt system prompt includes maxResponseLength constraint', () => {
    fc.assert(
      fc.property(
        agentConfigArb,
        fc.array(searchResultArb, { minLength: 0, maxLength: 10 }),
        fc.array(historyMessageArb, { minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (config: AgentConfig, fragments: SearchResult[], history: HistoryMessage[], userMessage: string) => {
          const prompt = buildFullPrompt({ config, fragments, history, userMessage });

          expect(prompt.systemPrompt).toContain(String(config.maxResponseLength));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('LlmPrompt.maxResponseLength equals config.maxResponseLength', () => {
    fc.assert(
      fc.property(
        agentConfigArb,
        fc.array(searchResultArb, { minLength: 0, maxLength: 10 }),
        fc.array(historyMessageArb, { minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (config: AgentConfig, fragments: SearchResult[], history: HistoryMessage[], userMessage: string) => {
          const prompt = buildFullPrompt({ config, fragments, history, userMessage });

          expect(prompt.maxResponseLength).toBe(config.maxResponseLength);
        },
      ),
      { numRuns: 100 },
    );
  });
});
