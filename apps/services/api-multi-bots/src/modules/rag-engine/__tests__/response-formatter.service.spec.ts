import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ResponseFormatterService } from '../services/response-formatter.service';
import { ResponseType } from '@multibotagents/types';

/**
 * Property 6: Response formatting produces valid output
 *
 * For any non-empty LLM response string, the response formatter SHALL produce
 * a non-empty array of ResponseMessage objects where each message has a valid
 * type ('text', 'image', or 'document') and non-empty content.
 *
 * **Validates: Requirements 6.2**
 */

/**
 * Property 8: Response length enforcement
 *
 * For any LLM response and any maxResponseLength value, the total content
 * length of all ResponseMessage objects in the output SHALL not exceed
 * the configured maximum.
 *
 * **Validates: Requirements 6.4**
 */

// Generators
const nonEmptyContentArb = fc.string({ minLength: 1, maxLength: 5000 }).filter(s => s.trim().length > 0);
const maxResponseLengthArb = fc.integer({ min: 1, max: 5000 });

const VALID_RESPONSE_TYPES: string[] = [ResponseType.TEXT, ResponseType.IMAGE, ResponseType.DOCUMENT];

describe('Feature: rag-agent-engine, Property 6: Response formatting produces valid output', () => {
  const service = new ResponseFormatterService();

  it('non-empty, non-whitespace content produces a non-empty array of ResponseMessage', () => {
    fc.assert(
      fc.property(
        nonEmptyContentArb,
        maxResponseLengthArb,
        (content: string, maxResponseLength: number) => {
          const result = service.format(content, maxResponseLength);

          // Result must be a non-empty array
          expect(result).toBeInstanceOf(Array);
          expect(result.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('each ResponseMessage has a valid type (text, image, or document)', () => {
    fc.assert(
      fc.property(
        nonEmptyContentArb,
        maxResponseLengthArb,
        (content: string, maxResponseLength: number) => {
          const result = service.format(content, maxResponseLength);

          for (const message of result) {
            expect(VALID_RESPONSE_TYPES).toContain(message.type);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('each ResponseMessage has non-empty content', () => {
    fc.assert(
      fc.property(
        nonEmptyContentArb,
        maxResponseLengthArb,
        (content: string, maxResponseLength: number) => {
          const result = service.format(content, maxResponseLength);

          for (const message of result) {
            expect(message.content.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('empty or whitespace-only content produces an empty array', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n', '  \n\t  '),
        maxResponseLengthArb,
        (content: string, maxResponseLength: number) => {
          const result = service.format(content, maxResponseLength);

          expect(result).toEqual([]);
        },
      ),
      { numRuns: 20 },
    );
  });
});

describe('Feature: rag-agent-engine, Property 8: Response length enforcement', () => {
  const service = new ResponseFormatterService();

  it('total content length of all ResponseMessage objects does not exceed maxResponseLength', () => {
    fc.assert(
      fc.property(
        nonEmptyContentArb,
        maxResponseLengthArb,
        (content: string, maxResponseLength: number) => {
          const result = service.format(content, maxResponseLength);

          const totalLength = result.reduce((sum, msg) => sum + msg.content.length, 0);
          expect(totalLength).toBeLessThanOrEqual(maxResponseLength);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('if content length <= maxResponseLength, content is preserved unchanged', () => {
    fc.assert(
      fc.property(
        nonEmptyContentArb,
        (content: string) => {
          // Use a maxResponseLength that is >= content length
          const maxResponseLength = content.length + 100;
          const result = service.format(content, maxResponseLength);

          const totalContent = result.map(msg => msg.content).join('');
          expect(totalContent).toBe(content);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('if content length > maxResponseLength, content is truncated to exactly maxResponseLength characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 5000 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 9 }),
        (content: string, maxResponseLength: number) => {
          // Ensure content is longer than maxResponseLength
          fc.pre(content.length > maxResponseLength);

          const result = service.format(content, maxResponseLength);

          const totalLength = result.reduce((sum, msg) => sum + msg.content.length, 0);
          expect(totalLength).toBe(maxResponseLength);
        },
      ),
      { numRuns: 20 },
    );
  });
});
