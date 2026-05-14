import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangePasswordService, changePwdKey } from '../change-password.service';
import type { ChangePasswordDeps, IChangePasswordUserRepository } from '../interfaces/change-password.interfaces';
import {
  InvalidCurrentPasswordError,
  SameAsCurrentError,
  PasswordValidationError,
  UserNotFoundError,
  RateLimitExceededError,
} from '../interfaces/change-password.interfaces';
import type { PasswordService } from '../password.service';
import type { IRateLimitRepository, RateLimitRecord } from '@multibotagents/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockDeps(): ChangePasswordDeps {
  return {
    userRepository: {
      findById: vi.fn(),
      updatePasswordHash: vi.fn(),
    } as unknown as IChangePasswordUserRepository,
    passwordService: {
      hash: vi.fn(),
      verify: vi.fn(),
    } as unknown as PasswordService,
    rateLimitRepository: {
      findByKey: vi.fn(),
      upsertAttempt: vi.fn(),
      resetByKey: vi.fn(),
    } as unknown as IRateLimitRepository,
  };
}

/** Contraseña válida que cumple todas las reglas de seguridad. */
const VALID_NEW_PASSWORD = 'NewP@ss1!';
const CURRENT_PASSWORD = 'OldP@ss1!';
const USER_ID = 'user-123';
const STORED_HASH = '$2a$12$hashedpassword';
const NEW_HASH = '$2a$12$newhashedpassword';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChangePasswordService', () => {
  let service: ChangePasswordService;
  let deps: ChangePasswordDeps;

  beforeEach(() => {
    deps = createMockDeps();
    service = new ChangePasswordService(deps);
  });

  describe('happy path — flujo exitoso', () => {
    it('should change password successfully when all validations pass', async () => {
      // Arrange: no rate limit, user exists, current password valid, new password valid & different
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: STORED_HASH,
      });
      // First verify call: current password matches
      // Second verify call: new password does NOT match current (not same)
      (deps.passwordService.verify as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true)   // current password is correct
        .mockResolvedValueOnce(false); // new password is different from current
      (deps.passwordService.hash as ReturnType<typeof vi.fn>).mockResolvedValue(NEW_HASH);
      (deps.userRepository.updatePasswordHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (deps.rateLimitRepository.resetByKey as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Act
      await expect(service.execute(USER_ID, CURRENT_PASSWORD, VALID_NEW_PASSWORD)).resolves.toBeUndefined();

      // Assert: verify the correct flow order
      expect(deps.rateLimitRepository.findByKey).toHaveBeenCalledWith(changePwdKey(USER_ID));
      expect(deps.userRepository.findById).toHaveBeenCalledWith(USER_ID);
      expect(deps.passwordService.verify).toHaveBeenCalledWith(CURRENT_PASSWORD, STORED_HASH);
      expect(deps.passwordService.hash).toHaveBeenCalled();
      expect(deps.userRepository.updatePasswordHash).toHaveBeenCalledWith(USER_ID, NEW_HASH);
      expect(deps.rateLimitRepository.resetByKey).toHaveBeenCalledWith(changePwdKey(USER_ID));
    });
  });

  describe('user not found', () => {
    it('should throw UserNotFoundError when user does not exist', async () => {
      // Arrange
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(USER_ID, CURRENT_PASSWORD, VALID_NEW_PASSWORD))
        .rejects.toThrow(UserNotFoundError);

      // Should not attempt password verification
      expect(deps.passwordService.verify).not.toHaveBeenCalled();
    });
  });

  describe('invalid current password', () => {
    it('should throw InvalidCurrentPasswordError and record failed attempt', async () => {
      // Arrange
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: STORED_HASH,
      });
      (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (deps.rateLimitRepository.upsertAttempt as ReturnType<typeof vi.fn>).mockResolvedValue({} as RateLimitRecord);

      // Act & Assert
      await expect(service.execute(USER_ID, 'wrong-password', VALID_NEW_PASSWORD))
        .rejects.toThrow(InvalidCurrentPasswordError);

      // Should record the failed attempt
      expect(deps.rateLimitRepository.upsertAttempt).toHaveBeenCalledWith(
        changePwdKey(USER_ID),
        900_000,  // WINDOW_MS
        900_000,  // BLOCK_DURATION_MS
        5,        // MAX_ATTEMPTS
      );

      // Should not proceed to hash or update
      expect(deps.passwordService.hash).not.toHaveBeenCalled();
      expect(deps.userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });
  });

  describe('rate limit exceeded', () => {
    it('should throw RateLimitExceededError when blockedUntil is in the future', async () => {
      // Arrange: user is blocked for 600 more seconds
      const futureDate = new Date(Date.now() + 600_000);
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'rl-1',
        key: changePwdKey(USER_ID),
        attempts: 5,
        blockedUntil: futureDate,
        expiresAt: futureDate,
        createdAt: new Date(),
      } as RateLimitRecord);

      // Act & Assert
      await expect(service.execute(USER_ID, CURRENT_PASSWORD, VALID_NEW_PASSWORD))
        .rejects.toThrow(RateLimitExceededError);

      // Should not attempt to find user or verify password
      expect(deps.userRepository.findById).not.toHaveBeenCalled();
      expect(deps.passwordService.verify).not.toHaveBeenCalled();
    });

    it('should include retryAfterSeconds in the error', async () => {
      // Arrange: blocked for ~600 seconds
      const futureDate = new Date(Date.now() + 600_000);
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'rl-1',
        key: changePwdKey(USER_ID),
        attempts: 5,
        blockedUntil: futureDate,
        expiresAt: futureDate,
        createdAt: new Date(),
      } as RateLimitRecord);

      // Act & Assert
      try {
        await service.execute(USER_ID, CURRENT_PASSWORD, VALID_NEW_PASSWORD);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitExceededError);
        const rateLimitErr = err as RateLimitExceededError;
        expect(rateLimitErr.retryAfterSeconds).toBeGreaterThan(0);
        expect(rateLimitErr.retryAfterSeconds).toBeLessThanOrEqual(600);
      }
    });

    it('should allow request when blockedUntil is in the past', async () => {
      // Arrange: block expired
      const pastDate = new Date(Date.now() - 1000);
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'rl-1',
        key: changePwdKey(USER_ID),
        attempts: 5,
        blockedUntil: pastDate,
        expiresAt: pastDate,
        createdAt: new Date(),
      } as RateLimitRecord);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: STORED_HASH,
      });
      (deps.passwordService.verify as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (deps.passwordService.hash as ReturnType<typeof vi.fn>).mockResolvedValue(NEW_HASH);
      (deps.userRepository.updatePasswordHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (deps.rateLimitRepository.resetByKey as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Act: should proceed normally
      await expect(service.execute(USER_ID, CURRENT_PASSWORD, VALID_NEW_PASSWORD)).resolves.toBeUndefined();
    });
  });

  describe('same as current password', () => {
    it('should throw SameAsCurrentError when new password matches current', async () => {
      // Arrange
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: STORED_HASH,
      });
      // First verify: current password is correct
      // Second verify: new password IS the same as current
      (deps.passwordService.verify as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true)  // current password correct
        .mockResolvedValueOnce(true); // new password same as current

      // Act & Assert
      await expect(service.execute(USER_ID, CURRENT_PASSWORD, CURRENT_PASSWORD))
        .rejects.toThrow(SameAsCurrentError);

      // Should not proceed to hash or update
      expect(deps.passwordService.hash).not.toHaveBeenCalled();
      expect(deps.userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });
  });

  describe('validation failed', () => {
    it('should throw PasswordValidationError when new password does not meet rules', async () => {
      // Arrange
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: STORED_HASH,
      });
      (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      // Act & Assert: "short" doesn't meet MIN_LENGTH, UPPERCASE, DIGIT, SPECIAL_CHAR
      await expect(service.execute(USER_ID, CURRENT_PASSWORD, 'short'))
        .rejects.toThrow(PasswordValidationError);

      // Should not proceed to check same-as-current, hash, or update
      expect(deps.passwordService.hash).not.toHaveBeenCalled();
      expect(deps.userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('should include validation result with failed rules', async () => {
      // Arrange
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: STORED_HASH,
      });
      (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      // Act & Assert: "abc" fails MIN_LENGTH, UPPERCASE, DIGIT, SPECIAL_CHAR
      try {
        await service.execute(USER_ID, CURRENT_PASSWORD, 'abc');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(PasswordValidationError);
        const validationErr = err as PasswordValidationError;
        expect(validationErr.validationResult).toBeDefined();
        expect(validationErr.validationResult.isValid).toBe(false);
        expect(validationErr.validationResult.rules).toHaveLength(6);

        // MIN_LENGTH should fail for "abc"
        const minLengthRule = validationErr.validationResult.rules.find(r => r.rule === 'MIN_LENGTH');
        expect(minLengthRule?.passed).toBe(false);
      }
    });
  });

  describe('DB update failure', () => {
    it('should throw error when updatePasswordHash returns false', async () => {
      // Arrange
      (deps.rateLimitRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: STORED_HASH,
      });
      (deps.passwordService.verify as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (deps.passwordService.hash as ReturnType<typeof vi.fn>).mockResolvedValue(NEW_HASH);
      (deps.userRepository.updatePasswordHash as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      // Act & Assert
      await expect(service.execute(USER_ID, CURRENT_PASSWORD, VALID_NEW_PASSWORD))
        .rejects.toThrow('No se pudo actualizar la contraseña. Intenta más tarde.');

      // Should not reset rate limit on failure
      expect(deps.rateLimitRepository.resetByKey).not.toHaveBeenCalled();
    });
  });

  describe('changePwdKey helper', () => {
    it('should generate correct rate limit key', () => {
      expect(changePwdKey('user-abc')).toBe('change-pwd:user-abc');
    });
  });
});
