/**
 * Property Test: Ciclo de vida del reenvío de token
 *
 * Feature: email-verification, Property 8: Ciclo de vida del reenvío de token
 *
 * Para cualquier usuario con N tokens de verificación previos (donde N >= 0),
 * cuando se solicita un reenvío exitoso:
 * - Todos los tokens previos de tipo `email_verification` son invalidados (invalidateAllByUserAndType llamado exactamente una vez)
 * - Existe exactamente un nuevo token válido (createForUser llamado exactamente una vez)
 * - Existe exactamente un nuevo documento en la cola de emails (enqueue llamado exactamente una vez)
 * - El token en el email encolado coincide con el token creado por createForUser
 *
 * **Validates: Requirements 5.2, 5.3**
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

// ─── Constants ───────────────────────────────────────────────────────────────

const FRONTEND_DOMAIN = 'https://app.example.com';
const COOLDOWN_MS = 60_000;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generates arbitrary user IDs (non-empty alphanumeric strings). */
const userIdArb = fc.stringMatching(/^[a-z0-9]{8,24}$/);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockDeps(params: {
  userId: string;
  predictableToken: string;
}): EmailVerificationServiceDeps {
  const { userId, predictableToken } = params;
  const userEmail = `${userId}@example.com`;

  const verifyTokenRepository: IVerifyTokenRepository = {
    createForUser: vi.fn().mockResolvedValue({
      id: 'new-token-id',
      userId,
      token: predictableToken,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      createdAt: new Date(),
    }),
    findAndMarkUsed: vi.fn().mockResolvedValue(null),
    invalidateAllByUserAndType: vi.fn().mockResolvedValue(undefined),
    findByToken: vi.fn().mockResolvedValue(null),
    // Return a token created > 60s ago (past cooldown)
    findLatestByUserAndType: vi.fn().mockResolvedValue({
      id: 'latest-token',
      userId,
      type: 'email_verification',
      token: 'b'.repeat(64),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      createdAt: new Date(Date.now() - COOLDOWN_MS - 1000),
    }),
  };

  const emailQueueRepository: IEmailQueueRepository = {
    enqueue: vi.fn().mockResolvedValue({ id: 'queue-item-id' }),
  };

  const userRepository: IUserRepository = {
    findById: vi.fn().mockResolvedValue({
      id: userId,
      email: userEmail,
      passwordHash: 'hash',
      emailVerified: false,
      companyId: 'company-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    markEmailVerified: vi.fn().mockResolvedValue(undefined),
  };

  // Mock tokenService to return a predictable token
  const tokenService = new TokenService();
  vi.spyOn(tokenService, 'generateVerificationToken').mockReturnValue(predictableToken);

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
      frontendDomain: FRONTEND_DOMAIN,
      tokenTtlMs: TOKEN_TTL_MS,
      resendCooldownMs: COOLDOWN_MS,
    },
  };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: email-verification, Property 8: Ciclo de vida del reenvío de token', () => {
  it('Property A: After a successful resend, invalidateAllByUserAndType is called exactly once with the correct userId and type email_verification', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        const predictableToken = 'a'.repeat(64);
        const deps = createMockDeps({ userId, predictableToken });
        const service = new EmailVerificationService(deps);

        await service.resendVerification({ userId });

        // invalidateAllByUserAndType called exactly once
        expect(deps.verifyTokenRepository.invalidateAllByUserAndType).toHaveBeenCalledTimes(1);
        // Called with correct userId and type
        expect(deps.verifyTokenRepository.invalidateAllByUserAndType).toHaveBeenCalledWith(
          userId,
          'email_verification',
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property B: After a successful resend, createForUser is called exactly once (creating exactly 1 new token)', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        const predictableToken = 'c'.repeat(64);
        const deps = createMockDeps({ userId, predictableToken });
        const service = new EmailVerificationService(deps);

        await service.resendVerification({ userId });

        // createForUser called exactly once
        expect(deps.verifyTokenRepository.createForUser).toHaveBeenCalledTimes(1);
        // Called with correct userId, type, and the generated token
        expect(deps.verifyTokenRepository.createForUser).toHaveBeenCalledWith(
          userId,
          'email_verification',
          predictableToken,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property C: After a successful resend, enqueue is called exactly once (creating exactly 1 new email in the queue)', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        const predictableToken = 'd'.repeat(64);
        const deps = createMockDeps({ userId, predictableToken });
        const service = new EmailVerificationService(deps);

        await service.resendVerification({ userId });

        // enqueue called exactly once
        expect(deps.emailQueueRepository.enqueue).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 },
    );
  });

  it('Property D: The new token in the enqueued email payload matches the token created by createForUser', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        const predictableToken = 'e'.repeat(64);
        const deps = createMockDeps({ userId, predictableToken });
        const service = new EmailVerificationService(deps);

        await service.resendVerification({ userId });

        // Get the token passed to createForUser
        const createForUserCall = vi.mocked(deps.verifyTokenRepository.createForUser).mock.calls[0];
        const tokenPassedToCreate = createForUserCall[2]; // third argument is the token

        // Get the token in the enqueued email payload
        const enqueueCall = vi.mocked(deps.emailQueueRepository.enqueue).mock.calls[0][0];
        const tokenInPayload = enqueueCall.payload.token;

        // They must match
        expect(tokenInPayload).toBe(tokenPassedToCreate);
        // Both must equal the predictable token
        expect(tokenInPayload).toBe(predictableToken);
        expect(tokenPassedToCreate).toBe(predictableToken);
      }),
      { numRuns: 100 },
    );
  });
});
