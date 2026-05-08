import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ReRankingService } from '../services/re-ranking.service';
import type { LlmProvider, LlmPrompt, LlmResponse, SearchResult } from '@multibotagents/types';

/**
 * Property 4: Only validated fragments appear in prompt context
 *
 * For any set of fragments that pass threshold filtering, after re-ranking
 * validates a subset, the result SHALL contain ONLY the fragments marked
 * as validated by re-ranking and no others.
 *
 * **Validates: Requirements 4.3**
 */

const searchResultArb = fc.record({
  fragmentId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  score: fc.float({ min: 0, max: 1, noNaN: true }),
  metadata: fc.constant({} as Record<string, unknown>),
});

describe('Feature: rag-agent-engine, Property 4: Only validated fragments appear in prompt context', () => {
  it('output contains ONLY fragments at validated indices', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(searchResultArb, { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.func(fc.boolean()),
        async (fragments: SearchResult[], userMessage: string, shouldInclude: (v: unknown) => boolean) => {
          // Determine which indices the mock LLM will "validate"
          const validatedIndices: number[] = [];
          for (let i = 0; i < fragments.length; i++) {
            if (shouldInclude(i)) {
              validatedIndices.push(i);
            }
          }

          // Create a mock LlmProvider that returns the validated indices as JSON
          const mockLlmProvider: LlmProvider = {
            generate: async (_prompt: LlmPrompt): Promise<LlmResponse> => ({
              content: JSON.stringify(validatedIndices),
              tokensUsed: 10,
              finishReason: 'stop',
            }),
          };

          // Instantiate ReRankingService directly with the mock
          const service = new ReRankingService(mockLlmProvider);

          const result = await service.validate(fragments, userMessage);

          // Verify: result contains ONLY fragments at validated indices
          const expectedFragments = fragments.filter((_, index) =>
            validatedIndices.includes(index),
          );

          expect(result).toHaveLength(expectedFragments.length);

          for (const fragment of result) {
            expect(expectedFragments).toContainEqual(fragment);
          }

          // Verify: no fragment NOT in validated indices appears in result
          const nonValidatedFragments = fragments.filter((_, index) =>
            !validatedIndices.includes(index),
          );

          for (const excluded of nonValidatedFragments) {
            expect(result).not.toContainEqual(excluded);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty validated indices returns empty result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(searchResultArb, { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (fragments: SearchResult[], userMessage: string) => {
          // Mock LLM returns empty array (no fragments validated)
          const mockLlmProvider: LlmProvider = {
            generate: async (_prompt: LlmPrompt): Promise<LlmResponse> => ({
              content: '[]',
              tokensUsed: 10,
              finishReason: 'stop',
            }),
          };

          const service = new ReRankingService(mockLlmProvider);
          const result = await service.validate(fragments, userMessage);

          expect(result).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all indices validated returns all fragments', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(searchResultArb, { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (fragments: SearchResult[], userMessage: string) => {
          // Mock LLM returns all indices
          const allIndices = Array.from({ length: fragments.length }, (_, i) => i);

          const mockLlmProvider: LlmProvider = {
            generate: async (_prompt: LlmPrompt): Promise<LlmResponse> => ({
              content: JSON.stringify(allIndices),
              tokensUsed: 10,
              finishReason: 'stop',
            }),
          };

          const service = new ReRankingService(mockLlmProvider);
          const result = await service.validate(fragments, userMessage);

          expect(result).toHaveLength(fragments.length);

          for (let i = 0; i < fragments.length; i++) {
            expect(result[i]).toEqual(fragments[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
