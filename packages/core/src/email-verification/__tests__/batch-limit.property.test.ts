/**
 * Property Test: Límite de batch del worker
 *
 * Feature: email-verification, Property 4: Límite de batch del worker
 *
 * Para cualquier cola con N documentos elegibles (donde N puede ser 0, 1, 50, 100,
 * o cualquier número), el worker procesa como máximo 50 documentos por invocación.
 *
 * **Validates: Requirements 3.1**
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { EmailWorkerService } from '../email-worker.service';
import type {
  EmailWorkerServiceDeps,
  IEmailWorkerQueueRepository,
  EmailWorkerConfig,
} from '../email-worker.service';
import type { EmailQueueItem } from '@multibotagents/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockEmailQueueItem(index: number): EmailQueueItem {
  return {
    id: `item-${index}`,
    to: `user${index}@example.com`,
    template: 'verification' as any,
    payload: {
      token: 'a'.repeat(64),
      username: `User ${index}`,
    },
    status: 'pending' as any,
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockDeps(eligibleCount: number): EmailWorkerServiceDeps {
  // Generate eligible items capped at batchSize (simulates repository limit behavior)
  const returnedItems = Array.from(
    { length: Math.min(eligibleCount, BATCH_SIZE) },
    (_, i) => createMockEmailQueueItem(i),
  );

  const emailQueueRepository: IEmailWorkerQueueRepository = {
    enqueue: vi.fn().mockResolvedValue({ id: 'queue-item-id' }),
    findEligible: vi.fn().mockResolvedValue(returnedItems),
    takeForProcessing: vi.fn().mockImplementation((id: string) => {
      const item = returnedItems.find((i) => i.id === id);
      return Promise.resolve(item ?? null);
    }),
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
    batchSize: BATCH_SIZE,
    retryDelays: [60000, 300000, 900000],
    maxRetries: 3,
    frontendDomain: 'https://app.example.com',
    stuckTimeoutMs: 5 * 60 * 1000,
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

describe('Feature: email-verification, Property 4: Límite de batch del worker', () => {
  it('Property: For any queue with N eligible documents (0..200), the worker processes at most 50', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 200 }),
        async (n) => {
          const deps = createMockDeps(n);
          const service = new EmailWorkerService(deps);

          const result = await service.processQueue();

          // The worker must never process more than batchSize (50) documents
          expect(result.processed).toBeLessThanOrEqual(BATCH_SIZE);

          // emailSender.send must be called at most 50 times
          expect(deps.emailSender.send).toHaveBeenCalledTimes(
            Math.min(n, BATCH_SIZE),
          );

          // Verify findEligible was called with the batchSize limit
          expect(deps.emailQueueRepository.findEligible).toHaveBeenCalledWith(BATCH_SIZE);
        },
      ),
      { numRuns: 100 },
    );
  });
});
