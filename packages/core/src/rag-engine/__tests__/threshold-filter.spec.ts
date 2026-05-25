import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterByThreshold } from '../threshold-filter';
import { SearchResult } from '@multibotagents/types';

/**
 * Property 3: Threshold filtering correctness
 *
 * For any array of SearchResult objects and any relevanceThreshold value
 * between 0.0 and 1.0:
 * (a) all results in the filtered output SHALL have a score >= threshold
 * (b) no result from the original array with score >= threshold SHALL be missing from the filtered output
 *
 * **Validates: Requirements 3.3, 3.4**
 */

const searchResultArb = fc.record({
  fragmentId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  score: fc.float({ min: 0, max: 1, noNaN: true }),
  metadata: fc.constant({} as Record<string, unknown>),
});

describe('Feature: rag-agent-engine, Property 3: Threshold filtering correctness', () => {
  it('all results in filtered output have score >= threshold', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArb, { minLength: 0, maxLength: 50 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (results: SearchResult[], threshold: number) => {
          const filtered = filterByThreshold(results, threshold);

          for (const result of filtered) {
            expect(result.score).toBeGreaterThanOrEqual(threshold);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no result with score >= threshold is excluded from filtered output', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArb, { minLength: 0, maxLength: 50 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (results: SearchResult[], threshold: number) => {
          const filtered = filterByThreshold(results, threshold);

          const expectedAboveThreshold = results.filter(r => r.score >= threshold);
          expect(filtered.length).toBe(expectedAboveThreshold.length);

          for (const expected of expectedAboveThreshold) {
            expect(filtered).toContainEqual(expected);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('filtered array is a subset of the original array (no new elements introduced)', () => {
    fc.assert(
      fc.property(
        fc.array(searchResultArb, { minLength: 0, maxLength: 50 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (results: SearchResult[], threshold: number) => {
          const filtered = filterByThreshold(results, threshold);

          for (const result of filtered) {
            expect(results).toContainEqual(result);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
