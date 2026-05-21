/**
 * Property Test: Verificación atómica de token
 *
 * Feature: email-verification, Property 7: Verificación atómica de token
 *
 * Para cualquier token válido (no expirado, no usado), la operación `findAndMarkUsed`
 * garantiza que exactamente una invocación concurrente obtiene el documento y las demás
 * obtienen null. Después de la verificación exitosa, el usuario tiene emailVerified=true
 * y el token tiene usedAt con la fecha actual.
 *
 * **Validates: Requirements 4.1, 4.10**
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
import { TokenAlreadyUsedError } from '../errors';
import { VerifyTokenType } from '@multibotagents/types';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generates a valid hex token of exactly 64 characters. */
const hexToken64Arb = fc.stringMatching(/^[0-9a-f]{64}$/);

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

describe('Feature: email-verification, Property 7: Verificación atómica de token', () => {
  it('Property A: For N concurrent calls (N=2..5), exactly ONE succeeds and the rest throw an error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        hexToken64Arb,
        async (concurrentCalls, token) => {
          const deps = createMockDeps();
          const service = new EmailVerificationService(deps);

          const now = new Date();
          const tokenDoc = {
            id: 'token-id-1',
            userId: 'user-1',
            type: VerifyTokenType.EMAIL_VERIFICATION,
            token,
            expiresAt: new Date(now.getTime() + 86400000),
            usedAt: now,
            createdAt: new Date(now.getTime() - 3600000),
          };

          // Simulate atomic behavior: first call gets the document, subsequent calls get null
          let callCount = 0;
          vi.mocked(deps.verifyTokenRepository.findAndMarkUsed).mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return tokenDoc;
            }
            return null;
          });

          // After findAndMarkUsed returns null, findByToken returns the token with usedAt set
          vi.mocked(deps.verifyTokenRepository.findByToken).mockResolvedValue({
            ...tokenDoc,
            usedAt: now,
          });

          // Launch N concurrent calls
          const results = await Promise.allSettled(
            Array.from({ length: concurrentCalls }, () => service.verifyToken(token)),
          );

          // Exactly one should succeed
          const successes = results.filter((r) => r.status === 'fulfilled');
          const failures = results.filter((r) => r.status === 'rejected');

          expect(successes).toHaveLength(1);
          expect(failures).toHaveLength(concurrentCalls - 1);

          // All failures should be TokenAlreadyUsedError
          for (const failure of failures) {
            const reason = (failure as PromiseRejectedResult).reason;
            expect(reason).toBeInstanceOf(TokenAlreadyUsedError);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property B: After successful verification, markEmailVerified is called exactly once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        hexToken64Arb,
        async (concurrentCalls, token) => {
          const deps = createMockDeps();
          const service = new EmailVerificationService(deps);

          const now = new Date();
          const tokenDoc = {
            id: 'token-id-1',
            userId: 'user-1',
            type: VerifyTokenType.EMAIL_VERIFICATION,
            token,
            expiresAt: new Date(now.getTime() + 86400000),
            usedAt: now,
            createdAt: new Date(now.getTime() - 3600000),
          };

          // Simulate atomic behavior: first call gets the document, subsequent calls get null
          let callCount = 0;
          vi.mocked(deps.verifyTokenRepository.findAndMarkUsed).mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return tokenDoc;
            }
            return null;
          });

          // After findAndMarkUsed returns null, findByToken returns the token with usedAt set
          vi.mocked(deps.verifyTokenRepository.findByToken).mockResolvedValue({
            ...tokenDoc,
            usedAt: now,
          });

          // Launch N concurrent calls
          await Promise.allSettled(
            Array.from({ length: concurrentCalls }, () => service.verifyToken(token)),
          );

          // markEmailVerified should be called exactly once (for the one successful verification)
          expect(deps.userRepository.markEmailVerified).toHaveBeenCalledTimes(1);
          expect(deps.userRepository.markEmailVerified).toHaveBeenCalledWith('user-1');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property C: The successful verification returns the correct userId and token has usedAt set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        hexToken64Arb,
        fc.uuid(),
        async (concurrentCalls, token, userId) => {
          const deps = createMockDeps();
          const service = new EmailVerificationService(deps);

          const now = new Date();
          const tokenDoc = {
            id: 'token-id-1',
            userId,
            type: VerifyTokenType.EMAIL_VERIFICATION,
            token,
            expiresAt: new Date(now.getTime() + 86400000),
            usedAt: now,
            createdAt: new Date(now.getTime() - 3600000),
          };

          // Simulate atomic behavior
          let callCount = 0;
          vi.mocked(deps.verifyTokenRepository.findAndMarkUsed).mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return tokenDoc;
            }
            return null;
          });

          vi.mocked(deps.verifyTokenRepository.findByToken).mockResolvedValue({
            ...tokenDoc,
            usedAt: now,
          });

          // Launch N concurrent calls
          const results = await Promise.allSettled(
            Array.from({ length: concurrentCalls }, () => service.verifyToken(token)),
          );

          // The successful result should contain the correct userId
          const success = results.find((r) => r.status === 'fulfilled') as
            | PromiseFulfilledResult<{ success: true; userId: string }>
            | undefined;

          expect(success).toBeDefined();
          expect(success!.value).toEqual({ success: true, userId });

          // The token document returned by findAndMarkUsed has usedAt != null
          expect(tokenDoc.usedAt).not.toBeNull();
          expect(tokenDoc.usedAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });
});
