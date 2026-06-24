import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPasswordService } from '../forgot-password.service';
import type {
  ForgotPasswordDeps,
  IForgotPasswordUserRepository,
  IForgotPasswordTokenRepository,
  IForgotPasswordEmailRepository,
  IForgotPasswordRateLimitService,
} from '../forgot-password.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockDeps(): ForgotPasswordDeps {
  return {
    userRepository: {
      findByEmail: vi.fn(),
    } as unknown as IForgotPasswordUserRepository,
    verifyTokenRepository: {
      invalidateByUserAndType: vi.fn(),
      create: vi.fn(),
    } as unknown as IForgotPasswordTokenRepository,
    emailQueueRepository: {
      enqueue: vi.fn(),
    } as unknown as IForgotPasswordEmailRepository,
    rateLimitService: {
      isRateLimited: vi.fn(),
      increment: vi.fn(),
    } as unknown as IForgotPasswordRateLimitService,
    frontendUrl: 'https://app.multibotagents.com',
  };
}

const TEST_EMAIL = 'user@example.com';
const USER_ID = 'user-123';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ForgotPasswordService', () => {
  let service: ForgotPasswordService;
  let deps: ForgotPasswordDeps;

  beforeEach(() => {
    deps = createMockDeps();
    service = new ForgotPasswordService(deps);
  });

  describe('email existe → genera token + encola email', () => {
    it('should generate token and enqueue email when user exists', async () => {
      // Arrange
      (deps.rateLimitService.isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (deps.rateLimitService.increment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        email: TEST_EMAIL,
      });
      (deps.verifyTokenRepository.invalidateByUserAndType as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.verifyTokenRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.emailQueueRepository.enqueue as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Act
      const result = await service.execute(TEST_EMAIL);

      // Assert: always returns void
      expect(result).toBeUndefined();

      // Assert: rate limit was checked and incremented
      expect(deps.rateLimitService.isRateLimited).toHaveBeenCalledWith(
        `forgot-pwd:${TEST_EMAIL}`,
        3,
        3_600_000,
      );
      expect(deps.rateLimitService.increment).toHaveBeenCalledWith(
        `forgot-pwd:${TEST_EMAIL}`,
        3_600_000,
      );

      // Assert: user was looked up
      expect(deps.userRepository.findByEmail).toHaveBeenCalledWith(TEST_EMAIL);

      // Assert: previous tokens were invalidated
      expect(deps.verifyTokenRepository.invalidateByUserAndType).toHaveBeenCalledWith(
        USER_ID,
        'password_reset',
      );

      // Assert: new token was created with correct structure
      expect(deps.verifyTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          type: 'password_reset',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );

      // Assert: token is 64 hex chars (32 bytes)
      const createCall = (deps.verifyTokenRepository.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createCall.token).toMatch(/^[a-f0-9]{64}$/);

      // Assert: expiresAt is approximately 1 hour from now
      const expiresAt = createCall.expiresAt as Date;
      const oneHourFromNow = Date.now() + 3_600_000;
      expect(expiresAt.getTime()).toBeGreaterThan(oneHourFromNow - 5000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(oneHourFromNow + 5000);

      // Assert: email was enqueued with correct template and payload
      expect(deps.emailQueueRepository.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          to: TEST_EMAIL,
          template: 'password_reset',
          payload: expect.objectContaining({
            resetLink: expect.stringContaining('https://app.multibotagents.com/reset-password?token='),
          }),
        }),
      );
    });

    it('should normalize email before processing (trim + toLowerCase)', async () => {
      // Arrange
      (deps.rateLimitService.isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (deps.rateLimitService.increment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        email: TEST_EMAIL,
      });
      (deps.verifyTokenRepository.invalidateByUserAndType as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.verifyTokenRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.emailQueueRepository.enqueue as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Act: pass email with spaces and uppercase
      await service.execute('  User@Example.COM  ');

      // Assert: normalized email used for lookup and rate limit
      expect(deps.rateLimitService.isRateLimited).toHaveBeenCalledWith(
        'forgot-pwd:user@example.com',
        3,
        3_600_000,
      );
      expect(deps.userRepository.findByEmail).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('email no existe → no genera token, no encola, no lanza error', () => {
    it('should return void without generating token or enqueuing email', async () => {
      // Arrange
      (deps.rateLimitService.isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (deps.rateLimitService.increment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Act
      const result = await service.execute(TEST_EMAIL);

      // Assert: returns void (no error thrown)
      expect(result).toBeUndefined();

      // Assert: rate limit was still checked and incremented
      expect(deps.rateLimitService.isRateLimited).toHaveBeenCalled();
      expect(deps.rateLimitService.increment).toHaveBeenCalled();

      // Assert: no token operations
      expect(deps.verifyTokenRepository.invalidateByUserAndType).not.toHaveBeenCalled();
      expect(deps.verifyTokenRepository.create).not.toHaveBeenCalled();

      // Assert: no email enqueued
      expect(deps.emailQueueRepository.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('rate limit excedido → no genera token, no encola, no lanza error', () => {
    it('should return void silently when rate limited', async () => {
      // Arrange: rate limit exceeded
      (deps.rateLimitService.isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      // Act
      const result = await service.execute(TEST_EMAIL);

      // Assert: returns void (no error thrown)
      expect(result).toBeUndefined();

      // Assert: did not increment (already limited)
      expect(deps.rateLimitService.increment).not.toHaveBeenCalled();

      // Assert: did not look up user
      expect(deps.userRepository.findByEmail).not.toHaveBeenCalled();

      // Assert: no token operations
      expect(deps.verifyTokenRepository.invalidateByUserAndType).not.toHaveBeenCalled();
      expect(deps.verifyTokenRepository.create).not.toHaveBeenCalled();

      // Assert: no email enqueued
      expect(deps.emailQueueRepository.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('invalida tokens previos antes de crear nuevo', () => {
    it('should invalidate previous tokens before creating a new one', async () => {
      // Arrange
      (deps.rateLimitService.isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (deps.rateLimitService.increment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        email: TEST_EMAIL,
      });
      (deps.verifyTokenRepository.invalidateByUserAndType as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.verifyTokenRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.emailQueueRepository.enqueue as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Act
      await service.execute(TEST_EMAIL);

      // Assert: invalidate was called before create
      const invalidateOrder = (deps.verifyTokenRepository.invalidateByUserAndType as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
      const createOrder = (deps.verifyTokenRepository.create as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
      expect(invalidateOrder).toBeLessThan(createOrder);

      // Assert: invalidate was called with correct args
      expect(deps.verifyTokenRepository.invalidateByUserAndType).toHaveBeenCalledWith(
        USER_ID,
        'password_reset',
      );
    });
  });

  describe('error handling — service never throws', () => {
    it('should not throw when userRepository.findByEmail throws', async () => {
      // Arrange
      (deps.rateLimitService.isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (deps.rateLimitService.increment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB connection error'));

      // Act & Assert: should not throw
      await expect(service.execute(TEST_EMAIL)).resolves.toBeUndefined();
    });

    it('should not throw when verifyTokenRepository.create throws', async () => {
      // Arrange
      (deps.rateLimitService.isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (deps.rateLimitService.increment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        email: TEST_EMAIL,
      });
      (deps.verifyTokenRepository.invalidateByUserAndType as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.verifyTokenRepository.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB write error'));

      // Act & Assert: should not throw
      await expect(service.execute(TEST_EMAIL)).resolves.toBeUndefined();
    });

    it('should not throw when emailQueueRepository.enqueue throws', async () => {
      // Arrange
      (deps.rateLimitService.isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (deps.rateLimitService.increment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        email: TEST_EMAIL,
      });
      (deps.verifyTokenRepository.invalidateByUserAndType as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.verifyTokenRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (deps.emailQueueRepository.enqueue as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Queue error'));

      // Act & Assert: should not throw
      await expect(service.execute(TEST_EMAIL)).resolves.toBeUndefined();
    });

    it('should not throw when rateLimitService throws', async () => {
      // Arrange
      (deps.rateLimitService.isRateLimited as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Rate limit service error'));

      // Act & Assert: should not throw
      await expect(service.execute(TEST_EMAIL)).resolves.toBeUndefined();
    });
  });
});
