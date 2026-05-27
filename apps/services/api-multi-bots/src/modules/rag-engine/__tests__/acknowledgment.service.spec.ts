import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AcknowledgmentService } from '../services/acknowledgment.service';

/**
 * Property 13: Acknowledgment timing correctness
 *
 * For any processing time and threshold:
 * - If processing takes longer than threshold, exactly 1 acknowledgment is emitted
 * - If processing completes before threshold, no acknowledgment is emitted
 * - The result of the processing promise is always returned regardless of acknowledgment
 *
 * **Validates: Requirements 10.1, 10.3, 10.6**
 */

describe('Feature: rag-agent-engine, Property 13: Acknowledgment timing correctness', () => {
  let service: AcknowledgmentService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new AcknowledgmentService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('slow processing (> threshold) emits exactly 1 acknowledgment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (thresholdMs: number, extraDelayMs: number, message: string) => {
          // threshold en segundos (valores pequeños para tests rápidos)
          const thresholdSec = thresholdMs / 1000;
          const totalDelayMs = thresholdMs + extraDelayMs;

          const onAcknowledgment = vi.fn();

          // Crear una promesa que se resuelve después del threshold
          let resolveProcessing: (value: string) => void;
          const processingPromise = new Promise<string>((resolve) => {
            resolveProcessing = resolve;
          });

          const resultPromise = service.raceWithProcessing(
            processingPromise,
            { threshold: thresholdSec, message },
            onAcknowledgment,
          );

          // Avanzar el timer hasta que el threshold se cumpla
          await vi.advanceTimersByTimeAsync(thresholdMs + 1);

          // El timer ganó, acknowledgment debería haberse emitido
          expect(onAcknowledgment).toHaveBeenCalledTimes(1);
          expect(onAcknowledgment).toHaveBeenCalledWith(message);

          // Ahora resolver el procesamiento
          resolveProcessing!('resultado');

          // Avanzar timers restantes para que la promesa se resuelva
          await vi.advanceTimersByTimeAsync(totalDelayMs);

          const result = await resultPromise;
          expect(result).toBe('resultado');

          // Verificar que sigue siendo exactamente 1 acknowledgment (no más)
          expect(onAcknowledgment).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('fast processing (< threshold) does not emit acknowledgment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (thresholdMs: number, message: string) => {
          const thresholdSec = thresholdMs / 1000;

          const onAcknowledgment = vi.fn();

          // Crear una promesa que se resuelve inmediatamente
          const processingPromise = Promise.resolve('resultado-rapido');

          const resultPromise = service.raceWithProcessing(
            processingPromise,
            { threshold: thresholdSec, message },
            onAcknowledgment,
          );

          // Avanzar microtasks para que la promesa resuelta gane la carrera
          await vi.advanceTimersByTimeAsync(0);

          const result = await resultPromise;

          // El procesamiento ganó: no se emite acknowledgment
          expect(onAcknowledgment).not.toHaveBeenCalled();
          expect(result).toBe('resultado-rapido');
        },
      ),
      { numRuns: 20 },
    );
  });

  it('processing result is always returned regardless of acknowledgment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.integer(),
          fc.record({ id: fc.uuid(), value: fc.float({ noNaN: true }) }),
        ),
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (thresholdMs, expectedResult, shouldBeSlower, message) => {
          const thresholdSec = thresholdMs / 1000;
          const onAcknowledgment = vi.fn();

          let resolveProcessing: (value: typeof expectedResult) => void;
          const processingPromise = new Promise<typeof expectedResult>((resolve) => {
            resolveProcessing = resolve;
          });

          const resultPromise = service.raceWithProcessing(
            processingPromise,
            { threshold: thresholdSec, message },
            onAcknowledgment,
          );

          if (shouldBeSlower) {
            // Procesamiento lento: avanzar más allá del threshold
            await vi.advanceTimersByTimeAsync(thresholdMs + 1);
            resolveProcessing!(expectedResult);
            await vi.advanceTimersByTimeAsync(1);
          } else {
            // Procesamiento rápido: resolver antes del threshold
            resolveProcessing!(expectedResult);
            await vi.advanceTimersByTimeAsync(0);
          }

          const result = await resultPromise;

          // Independientemente de si hubo acknowledgment, el resultado siempre se retorna
          expect(result).toEqual(expectedResult);
        },
      ),
      { numRuns: 20 },
    );
  });
});
