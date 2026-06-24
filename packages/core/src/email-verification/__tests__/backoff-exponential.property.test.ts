/**
 * Property Test: Cálculo de backoff exponencial
 *
 * Feature: email-verification, Property 5: Cálculo de backoff exponencial
 *
 * Para cualquier intento fallido con número de attempt en {1, 2, 3}:
 * - attempt 1 → nextRetryAt = now + 60000ms (1 min)
 * - attempt 2 → nextRetryAt = now + 300000ms (5 min)
 * - attempt 3 → nextRetryAt = null (sin más reintentos, attempt >= maxRetries)
 * - attempt >= 3 → nextRetryAt = null
 *
 * **Validates: Requirements 3.4, 3.5**
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { EmailWorkerService } from '../email-worker.service';
import type { EmailWorkerServiceDeps, EmailWorkerConfig, IEmailWorkerQueueRepository } from '../email-worker.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockDeps(): EmailWorkerServiceDeps {
  const emailQueueRepository: IEmailWorkerQueueRepository = {
    enqueue: vi.fn().mockResolvedValue({ id: 'queue-id' }),
    findEligible: vi.fn().mockResolvedValue([]),
    takeForProcessing: vi.fn().mockResolvedValue(null),
    markSent: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    countByStatus: vi.fn().mockResolvedValue(0),
    avgQueueTime: vi.fn().mockResolvedValue(0),
    resetStuckDocuments: vi.fn().mockResolvedValue(undefined),
  };

  const emailSender = {
    send: vi.fn().mockResolvedValue(undefined),
  };

  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  const config: EmailWorkerConfig = {
    retryDelays: [60000, 300000, 900000],
    maxRetries: 3,
    batchSize: 50,
    frontendDomain: 'https://app.example.com',
    stuckTimeoutMs: 300000,
    fromEmail: "test@example.com",
    fromName: "Test",
  };

  return {
    emailQueueRepository,
    emailSender,
    logger,
    config,
  };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: email-verification, Property 5: Cálculo de backoff exponencial', () => {
  it('Property A: For attempt=1, nextRetryAt is approximately now + 60000ms', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1 }),
        (attempt) => {
          const deps = createMockDeps();
          const service = new EmailWorkerService(deps);

          const before = Date.now();
          const result = service.calculateNextRetry(attempt);
          const after = Date.now();

          expect(result).not.toBeNull();
          const resultTime = result!.getTime();
          // nextRetryAt should be approximately now + 60000ms
          expect(resultTime).toBeGreaterThanOrEqual(before + 60000);
          expect(resultTime).toBeLessThanOrEqual(after + 60000);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property B: For attempt=2, nextRetryAt is approximately now + 300000ms', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 2 }),
        (attempt) => {
          const deps = createMockDeps();
          const service = new EmailWorkerService(deps);

          const before = Date.now();
          const result = service.calculateNextRetry(attempt);
          const after = Date.now();

          expect(result).not.toBeNull();
          const resultTime = result!.getTime();
          // nextRetryAt should be approximately now + 300000ms
          expect(resultTime).toBeGreaterThanOrEqual(before + 300000);
          expect(resultTime).toBeLessThanOrEqual(after + 300000);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property C: For attempt=3 (which equals maxRetries=3), nextRetryAt is null', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 3 }),
        (attempt) => {
          const deps = createMockDeps();
          const service = new EmailWorkerService(deps);

          const result = service.calculateNextRetry(attempt);

          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property D: For any attempt >= 3, nextRetryAt is null', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 1000 }),
        (attempt) => {
          const deps = createMockDeps();
          const service = new EmailWorkerService(deps);

          const result = service.calculateNextRetry(attempt);

          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
