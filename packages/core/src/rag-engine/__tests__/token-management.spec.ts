import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { truncateHistory, estimateTokens } from '../token-management';
import { HistoryMessage } from '@multibotagents/types';

/**
 * Property 2: Token truncation preserves recent messages within limit
 *
 * For any conversation history and any token limit, after truncation:
 * (a) the total token count of the remaining messages SHALL be <= the limit
 * (b) the messages retained SHALL be the most recent ones (oldest removed first)
 * (c) if the original history fits within the limit, it SHALL remain unchanged
 *
 * **Validates: Requirements 2.3**
 */

const historyMessageArb = fc.record({
  role: fc.constantFrom('user' as const, 'assistant' as const),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.date(),
});

describe('Feature: rag-agent-engine, Property 2: Token truncation preserves recent messages within limit', () => {
  it('total tokens after truncation <= maxTokens limit', () => {
    fc.assert(
      fc.property(
        fc.array(historyMessageArb, { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 1, max: 10000 }),
        (history: HistoryMessage[], maxTokens: number) => {
          const truncated = truncateHistory(history, maxTokens);

          const totalTokens = truncated.reduce(
            (sum, msg) => sum + estimateTokens(msg.content),
            0,
          );

          expect(totalTokens).toBeLessThanOrEqual(maxTokens);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('messages retained are the most recent ones (truncated result is a suffix of original)', () => {
    fc.assert(
      fc.property(
        fc.array(historyMessageArb, { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 1, max: 10000 }),
        (history: HistoryMessage[], maxTokens: number) => {
          const truncated = truncateHistory(history, maxTokens);

          if (truncated.length === 0) {
            return; // Edge case: maxTokens too small for any message
          }

          // The truncated result should be a suffix of the original array
          const startIndex = history.length - truncated.length;
          const expectedSuffix = history.slice(startIndex);

          expect(truncated).toEqual(expectedSuffix);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('if original history fits within limit, it remains unchanged (identity property)', () => {
    fc.assert(
      fc.property(
        fc.array(historyMessageArb, { minLength: 0, maxLength: 30 }),
        (history: HistoryMessage[]) => {
          const totalTokens = history.reduce(
            (sum, msg) => sum + estimateTokens(msg.content),
            0,
          );

          // Use a maxTokens that is >= total tokens so history fits
          const maxTokens = totalTokens + 100;

          const truncated = truncateHistory(history, maxTokens);

          expect(truncated).toEqual(history);
        },
      ),
      { numRuns: 20 },
    );
  });
});
