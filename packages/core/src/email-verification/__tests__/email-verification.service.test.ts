/**
 * Unit Tests para EmailVerificationService.
 *
 * Validates: Requirements 4.1, 4.5, 4.6, 4.7, 4.8, 4.10, 5.2, 5.3, 5.5, 5.6, 5.8, 6.6
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailVerificationService } from '../email-verification.service';
import type {
  EmailVerificationServiceDeps,
  IVerifyTokenRepository,
  IEmailQueueRepository,
  IUserRepository,
} from '../email-verification.service';
import { TokenService } from '../token.service';
import {
  TokenInvalidError,
  TokenExpiredError,
  TokenAlreadyUsedError,
  AlreadyVerifiedError,
  ResendCooldownError,
} from '../errors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockDeps(): EmailVerificationServiceDeps {
  const verifyTokenRepository: IVerifyTokenRepository = {
    createForUser: vi.fn().mockResolvedValue({ id: 'new-token-id', userId: 'user-1', token: 'a'.repeat(64), type: 'email_verification', expiresAt: new Date(Date.now() + 86400000), createdAt: new Date() }),
    findAndMarkUsed: vi.fn().mockResolvedValue(null),
    invalidateAllByUserAndType: vi.fn().mockResolvedValue(undefined),
    findByToken: vi.fn().mockResolvedValue(null),
    findLatestByUserAndType: vi.fn().mockResolvedValue(null),
  };

  const emailQueueRepository: IEmailQueueRepository = {
    enqueue: vi.fn().mockResolvedValue({ id: 'queue-item-id' }),
  };

  const userRepository: IUserRepository = {
    findById: vi.fn().mockResolvedValue(null),
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
      resendCooldownMs: 60 * 1000,
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let deps: EmailVerificationServiceDeps;

  beforeEach(() => {
    deps = createMockDeps();
    service = new EmailVerificationService(deps);
  });

  describe('verifyToken()', () => {
    it('should throw TokenInvalidError for invalid format token', async () => {
      await expect(service.verifyToken('invalid-token')).rejects.toThrow(TokenInvalidError);
    });

    it('should throw TokenInvalidError for empty string', async () => {
      await expect(service.verifyToken('')).rejects.toThrow(TokenInvalidError);
    });

    it('should throw TokenInvalidError when token does not exist in DB', async () => {
      const validToken = 'a'.repeat(64);
      vi.mocked(deps.verifyTokenRepository.findAndMarkUsed).mockResolvedValue(null);
      vi.mocked(deps.verifyTokenRepository.findByToken).mockResolvedValue(null);

      await expect(service.verifyToken(validToken)).rejects.toThrow(TokenInvalidError);
    });

    it('should throw TokenAlreadyUsedError when token was already used', async () => {
      const validToken = 'a'.repeat(64);
      vi.mocked(deps.verifyTokenRepository.findAndMarkUsed).mockResolvedValue(null);
      vi.mocked(deps.verifyTokenRepository.findByToken).mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        type: 'email_verification' as any,
        token: validToken,
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: new Date(),
        createdAt: new Date(),
      });

      await expect(service.verifyToken(validToken)).rejects.toThrow(TokenAlreadyUsedError);
    });

    it('should throw TokenExpiredError when token is expired', async () => {
      const validToken = 'a'.repeat(64);
      vi.mocked(deps.verifyTokenRepository.findAndMarkUsed).mockResolvedValue(null);
      vi.mocked(deps.verifyTokenRepository.findByToken).mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        type: 'email_verification' as any,
        token: validToken,
        expiresAt: new Date(Date.now() - 1000), // expired
        createdAt: new Date(Date.now() - 86400000),
      });

      await expect(service.verifyToken(validToken)).rejects.toThrow(TokenExpiredError);
    });

    it('should verify token successfully and mark email as verified', async () => {
      const validToken = 'a'.repeat(64);
      const tokenDoc = {
        id: 'token-1',
        userId: 'user-1',
        type: 'email_verification' as any,
        token: validToken,
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: new Date(),
        createdAt: new Date(),
      };

      vi.mocked(deps.verifyTokenRepository.findAndMarkUsed).mockResolvedValue(tokenDoc);

      const result = await service.verifyToken(validToken);

      expect(result).toEqual({ success: true, userId: 'user-1' });
      expect(deps.userRepository.markEmailVerified).toHaveBeenCalledWith('user-1');
    });

    it('should not query DB when token format is invalid', async () => {
      await expect(service.verifyToken('short')).rejects.toThrow(TokenInvalidError);
      expect(deps.verifyTokenRepository.findAndMarkUsed).not.toHaveBeenCalled();
      expect(deps.verifyTokenRepository.findByToken).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification()', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hash',
      emailVerified: false,
      companyId: 'company-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should throw TokenInvalidError when neither userId nor expiredToken provided', async () => {
      await expect(service.resendVerification({})).rejects.toThrow(TokenInvalidError);
    });

    it('should throw TokenInvalidError when expiredToken does not exist', async () => {
      vi.mocked(deps.verifyTokenRepository.findByToken).mockResolvedValue(null);

      await expect(
        service.resendVerification({ expiredToken: 'b'.repeat(64) }),
      ).rejects.toThrow(TokenInvalidError);
    });

    it('should throw AlreadyVerifiedError when user email is already verified', async () => {
      vi.mocked(deps.userRepository.findById).mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      await expect(
        service.resendVerification({ userId: 'user-1' }),
      ).rejects.toThrow(AlreadyVerifiedError);
    });

    it('should throw ResendCooldownError when cooldown is active', async () => {
      vi.mocked(deps.userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(deps.verifyTokenRepository.findLatestByUserAndType).mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        type: 'email_verification' as any,
        token: 'c'.repeat(64),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(Date.now() - 30000), // 30s ago, within 60s cooldown
      });

      await expect(
        service.resendVerification({ userId: 'user-1' }),
      ).rejects.toThrow(ResendCooldownError);
    });

    it('should resend verification successfully when cooldown has passed', async () => {
      vi.mocked(deps.userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(deps.verifyTokenRepository.findLatestByUserAndType).mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        type: 'email_verification' as any,
        token: 'c'.repeat(64),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(Date.now() - 120000), // 120s ago, past cooldown
      });

      const result = await service.resendVerification({ userId: 'user-1' });

      expect(result).toEqual({ success: true, email: 'test@example.com' });
      expect(deps.verifyTokenRepository.invalidateAllByUserAndType).toHaveBeenCalledWith(
        'user-1',
        'email_verification',
      );
      expect(deps.verifyTokenRepository.createForUser).toHaveBeenCalled();
      expect(deps.emailQueueRepository.enqueue).toHaveBeenCalled();
    });

    it('should resolve userId from expiredToken when userId not provided', async () => {
      vi.mocked(deps.verifyTokenRepository.findByToken).mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        type: 'email_verification' as any,
        token: 'd'.repeat(64),
        expiresAt: new Date(Date.now() - 1000), // expired
        createdAt: new Date(Date.now() - 86400000),
      });
      vi.mocked(deps.userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(deps.verifyTokenRepository.findLatestByUserAndType).mockResolvedValue(null);

      const result = await service.resendVerification({ expiredToken: 'd'.repeat(64) });

      expect(result).toEqual({ success: true, email: 'test@example.com' });
    });

    it('should enqueue email with correct payload', async () => {
      vi.mocked(deps.userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(deps.verifyTokenRepository.findLatestByUserAndType).mockResolvedValue(null);

      await service.resendVerification({ userId: 'user-1' });

      const enqueueCall = vi.mocked(deps.emailQueueRepository.enqueue).mock.calls[0][0];
      expect(enqueueCall.to).toBe('test@example.com');
      expect(enqueueCall.template).toBe('verification');
      expect(enqueueCall.payload).toHaveProperty('token');
      expect(enqueueCall.payload).toHaveProperty('url');
      expect(enqueueCall.payload).toHaveProperty('username');
      expect((enqueueCall.payload.url as string)).toContain('https://app.example.com/verify-email?token=');
    });

    it('should use email prefix as username in payload', async () => {
      vi.mocked(deps.userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(deps.verifyTokenRepository.findLatestByUserAndType).mockResolvedValue(null);

      await service.resendVerification({ userId: 'user-1' });

      const enqueueCall = vi.mocked(deps.emailQueueRepository.enqueue).mock.calls[0][0];
      expect(enqueueCall.payload.username).toBe('test');
    });
  });

  describe('isEmailVerified()', () => {
    it('should return true when emailVerified is true', () => {
      expect(service.isEmailVerified(true)).toBe(true);
    });

    it('should return false when emailVerified is false', () => {
      expect(service.isEmailVerified(false)).toBe(false);
    });
  });
});
