/**
 * Property Test: Enforcement del cooldown de reenvío
 *
 * Feature: email-verification, Property 9: Enforcement del cooldown de reenvío
 *
 * Para cualquier intervalo de tiempo T desde el último reenvío exitoso:
 * - Si T < 60 segundos, el sistema rechaza la solicitud con error RESEND_COOLDOWN.
 * - Si T >= 60 segundos, el sistema permite el reenvío.
 *
 * **Validates: Requirements 5.6**
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { EmailVerificationService } from '../email-verification.service';
import type {
  EmailVerificationServiceDeps,
  IVerifyTokenRepository,
  IEmailQueueRepository,
  IUserRepository,
} from '../email-verification.service';
import { TokenService } from '../token.service';
import { ResendCooldownError } from '../errors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockDeps(): EmailVerificationServiceDeps {
  const verifyTokenRepository: IVerifyTokenRepository = {
    createForUser: vi.fn().mockResolvedValue({
      id: 'new-token-id',
      userId: 'user-1',
      token: 'a'.repeat(64),
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    }),
    findAndMarkUsed: vi.fn().mockResolvedValue(null),
    invalidateAllByUserAndType: vi.fn().mockResolvedValue(undefined),
    findByToken: vi.fn().mockResolvedValue(null),
    findLatestByUserAndType: vi.fn().mockResolvedValue(null),
  };

  const emailQueueRepository: IEmailQueueRepository = {
    enqueue: vi.fn().mockResolvedValue({ id: 'queue-item-id' }),
  };

  const userRepository: IUserRepository = {
    findById: vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hash',
      emailVerified: false,
      companyId: 'company-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    markEmailVerified: vi.fn().mockResolvedValue(undefined),
  };

  const tokenService = new TokenService();

  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  const getSession = vi.fn().mockResolvedValue({
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    abortTransaction: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
  });

  return {
    verifyTokenRepository,
    emailQueueRepository,
    userRepository,
    tokenService,
    getSession,
    logger,
    config: {
      frontendDomain: 'https://app.example.com',
      tokenTtlMs: 24 * 60 * 60 * 1000,
      resendCooldownMs: 60_000,
    },
  };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: email-verification, Property 9: Enforcement del cooldown de reenvío', () => {
  it('Property A: For any time T < 60000ms since last token creation, resend throws ResendCooldownError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 59000 }),
        async (elapsedMs) => {
          const deps = createMockDeps();
          const service = new EmailVerificationService(deps);

          // Mock findLatestByUserAndType to return a token created T ms ago
          // Use a margin of 1000ms to avoid timing race at the boundary
          const now = Date.now();
          vi.mocked(deps.verifyTokenRepository.findLatestByUserAndType).mockResolvedValue({
            id: 'token-1',
            userId: 'user-1',
            type: 'email_verification' as any,
            token: 'b'.repeat(64),
            expiresAt: new Date(now + 86400000),
            createdAt: new Date(now - elapsedMs),
          });

          await expect(
            service.resendVerification({ userId: 'user-1' }),
          ).rejects.toThrow(ResendCooldownError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property B: For any time T >= 60000ms since last token creation, resend is allowed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 60000, max: 1000000 }),
        async (elapsedMs) => {
          const deps = createMockDeps();
          const service = new EmailVerificationService(deps);

          // Mock findLatestByUserAndType to return a token created T ms ago
          const now = Date.now();
          vi.mocked(deps.verifyTokenRepository.findLatestByUserAndType).mockResolvedValue({
            id: 'token-1',
            userId: 'user-1',
            type: 'email_verification' as any,
            token: 'b'.repeat(64),
            expiresAt: new Date(now + 86400000),
            createdAt: new Date(now - elapsedMs),
          });

          const result = await service.resendVerification({ userId: 'user-1' });

          expect(result).toEqual({ success: true, email: 'test@example.com' });
        },
      ),
      { numRuns: 100 },
    );
  });
});
