import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  shouldEscalateByAttempts,
  shouldEscalateByUncertainty,
  detectUserEscalationRequest,
} from '../escalation-rules';
import { LlmResponse } from '@multibotagents/types';

/**
 * Property 15: Escalation detection by failed attempts
 *
 * Verifica las reglas puras de escalamiento:
 * (a) shouldEscalateByAttempts retorna true cuando failedCount >= threshold
 * (b) shouldEscalateByAttempts retorna false cuando failedCount < threshold
 * (c) Reset a cero (failedCount = 0) siempre retorna false para cualquier threshold positivo
 * (d) shouldEscalateByUncertainty retorna true iff uncertaintyIndicator es true
 * (e) detectUserEscalationRequest retorna true iff el mensaje contiene al menos un patrón (case-insensitive)
 *
 * **Validates: Requirements 12.1**
 */

describe('Feature: rag-agent-engine, Property 15: Escalation detection by failed attempts', () => {
  describe('shouldEscalateByAttempts', () => {
    it('retorna true cuando failedCount >= threshold (enteros positivos)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (threshold: number, extra: number) => {
            const failedCount = threshold + extra - 1; // failedCount >= threshold
            expect(shouldEscalateByAttempts(failedCount, threshold)).toBe(true);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('retorna false cuando failedCount < threshold (enteros positivos)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 100 }),
          (threshold: number) => {
            const failedCount = fc.sample(fc.integer({ min: 0, max: threshold - 1 }), 1)[0];
            expect(shouldEscalateByAttempts(failedCount, threshold)).toBe(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('reset a cero (failedCount = 0) siempre retorna false para cualquier threshold positivo', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (threshold: number) => {
            expect(shouldEscalateByAttempts(0, threshold)).toBe(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('failedCount == threshold retorna true (caso límite exacto)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (threshold: number) => {
            expect(shouldEscalateByAttempts(threshold, threshold)).toBe(true);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('shouldEscalateByUncertainty', () => {
    it('retorna true cuando uncertaintyIndicator es true', () => {
      fc.assert(
        fc.property(
          fc.record({
            content: fc.string({ minLength: 0, maxLength: 500 }),
            tokensUsed: fc.integer({ min: 0, max: 10000 }),
            finishReason: fc.constantFrom('stop' as const, 'length' as const, 'error' as const),
            uncertaintyIndicator: fc.constant(true),
          }),
          (llmResponse: LlmResponse) => {
            expect(shouldEscalateByUncertainty(llmResponse)).toBe(true);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('retorna false cuando uncertaintyIndicator es false o undefined', () => {
      fc.assert(
        fc.property(
          fc.record({
            content: fc.string({ minLength: 0, maxLength: 500 }),
            tokensUsed: fc.integer({ min: 0, max: 10000 }),
            finishReason: fc.constantFrom('stop' as const, 'length' as const, 'error' as const),
            uncertaintyIndicator: fc.constantFrom(false, undefined),
          }),
          (llmResponse: LlmResponse) => {
            expect(shouldEscalateByUncertainty(llmResponse)).toBe(false);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('detectUserEscalationRequest', () => {
    it('retorna true cuando el mensaje contiene al menos un patrón (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
          fc.nat({ max: 100 }),
          (prefix: string, patterns: string[], suffixSeed: number) => {
            // Insertar un patrón en el mensaje para garantizar match
            const chosenPattern = patterns[suffixSeed % patterns.length];
            const message = prefix + chosenPattern.toUpperCase() + 'suffix';
            expect(detectUserEscalationRequest(message, patterns)).toBe(true);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('retorna false cuando el mensaje no contiene ningún patrón', () => {
      fc.assert(
        fc.property(
          fc.constant('este mensaje no tiene patrones de escalamiento xyz123'),
          fc.constant(['hablar con humano', 'agente real', 'persona real'] as string[]),
          (message: string, patterns: string[]) => {
            expect(detectUserEscalationRequest(message, patterns)).toBe(false);
          },
        ),
        { numRuns: 10 },
      );
    });

    it('retorna false cuando la lista de patrones está vacía', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 500 }),
          (message: string) => {
            expect(detectUserEscalationRequest(message, [])).toBe(false);
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
