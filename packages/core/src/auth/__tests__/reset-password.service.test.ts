import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ResetPasswordService,
  TokenInvalidError,
  TokenExpiredError,
  TokenAlreadyUsedError,
  PasswordValidationError,
} from '../reset-password.service';
import type {
  ResetPasswordDeps,
  IResetPasswordUserRepository,
  IResetPasswordTokenRepository,
  VerifyTokenDocument,
} from '../interfaces/password-recovery.interfaces';

// ─── Mock bcrypt to avoid slow hashing in tests ──────────────────────────────

vi.mock('bcryptjs', () => ({
  default: {
    genSalt: vi.fn().mockResolvedValue('salt'),
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockDeps(): ResetPasswordDeps {
  return {
    userRepository: {
      findById: vi.fn(),
      updatePasswordHash: vi.fn(),
    } as unknown as IResetPasswordUserRepository,
    verifyTokenRepository: {
      findByTokenAndType: vi.fn(),
      markAsUsed: vi.fn(),
    } as unknown as IResetPasswordTokenRepository,
  };
}

const VALID_TOKEN = 'a'.repeat(64);
const VALID_PASSWORD = 'ValidPass1!';
const INVALID_PASSWORD = 'weak';
const USER_ID = 'user-123';
const TOKEN_ID = 'token-456';

function createValidTokenDoc(overrides?: Partial<VerifyTokenDocument>): VerifyTokenDocument {
  return {
    id: TOKEN_ID,
    userId: USER_ID,
    type: 'password_reset',
    token: VALID_TOKEN,
    expiresAt: new Date(Date.now() + 3_600_000), // 1 hour from now
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ResetPasswordService', () => {
  let service: ResetPasswordService;
  let deps: ResetPasswordDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
    service = new ResetPasswordService(deps);
  });

  describe('Token válido + contraseña válida → actualiza hash + marca token', () => {
    it('should update password hash and mark token as used', async () => {
      // Arrange
      const tokenDoc = createValidTokenDoc();
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: 'old-hash',
      });
      (deps.userRepository.updatePasswordHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (deps.verifyTokenRepository.markAsUsed as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Act
      await service.execute(VALID_TOKEN, VALID_PASSWORD);

      // Assert: token was looked up
      expect(deps.verifyTokenRepository.findByTokenAndType).toHaveBeenCalledWith(
        VALID_TOKEN,
        'password_reset',
      );

      // Assert: user was looked up by token's userId
      expect(deps.userRepository.findById).toHaveBeenCalledWith(USER_ID);

      // Assert: password hash was updated
      expect(deps.userRepository.updatePasswordHash).toHaveBeenCalledWith(
        USER_ID,
        'hashed-password',
      );

      // Assert: token was marked as used
      expect(deps.verifyTokenRepository.markAsUsed).toHaveBeenCalledWith(TOKEN_ID);
    });

    it('should call updatePasswordHash before markAsUsed', async () => {
      // Arrange
      const tokenDoc = createValidTokenDoc();
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: 'old-hash',
      });
      (deps.userRepository.updatePasswordHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (deps.verifyTokenRepository.markAsUsed as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Act
      await service.execute(VALID_TOKEN, VALID_PASSWORD);

      // Assert: updatePasswordHash called before markAsUsed
      const updateOrder = (deps.userRepository.updatePasswordHash as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
      const markOrder = (deps.verifyTokenRepository.markAsUsed as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
      expect(updateOrder).toBeLessThan(markOrder);
    });
  });

  describe('Token no existe → TokenInvalidError', () => {
    it('should throw TokenInvalidError when token is not found', async () => {
      // Arrange
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(VALID_TOKEN, VALID_PASSWORD)).rejects.toThrow(TokenInvalidError);

      // Assert: no further operations performed
      expect(deps.userRepository.findById).not.toHaveBeenCalled();
      expect(deps.userRepository.updatePasswordHash).not.toHaveBeenCalled();
      expect(deps.verifyTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });

    it('should throw error with code TOKEN_INVALID', async () => {
      // Arrange
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Act & Assert
      try {
        await service.execute(VALID_TOKEN, VALID_PASSWORD);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenInvalidError);
        expect((error as TokenInvalidError).code).toBe('TOKEN_INVALID');
      }
    });
  });

  describe('Token expirado → TokenExpiredError', () => {
    it('should throw TokenExpiredError when token is expired', async () => {
      // Arrange: token expired 1 hour ago
      const tokenDoc = createValidTokenDoc({
        expiresAt: new Date(Date.now() - 3_600_000),
      });
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);

      // Act & Assert
      await expect(service.execute(VALID_TOKEN, VALID_PASSWORD)).rejects.toThrow(TokenExpiredError);

      // Assert: no password update or token marking
      expect(deps.userRepository.findById).not.toHaveBeenCalled();
      expect(deps.userRepository.updatePasswordHash).not.toHaveBeenCalled();
      expect(deps.verifyTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });

    it('should throw error with code TOKEN_EXPIRED', async () => {
      // Arrange
      const tokenDoc = createValidTokenDoc({
        expiresAt: new Date(Date.now() - 1000),
      });
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);

      // Act & Assert
      try {
        await service.execute(VALID_TOKEN, VALID_PASSWORD);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenExpiredError);
        expect((error as TokenExpiredError).code).toBe('TOKEN_EXPIRED');
      }
    });
  });

  describe('Token ya usado → TokenAlreadyUsedError', () => {
    it('should throw TokenAlreadyUsedError when token has usedAt set', async () => {
      // Arrange: token already used
      const tokenDoc = createValidTokenDoc({
        usedAt: new Date(Date.now() - 60_000),
      });
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);

      // Act & Assert
      await expect(service.execute(VALID_TOKEN, VALID_PASSWORD)).rejects.toThrow(TokenAlreadyUsedError);

      // Assert: no password update or token marking
      expect(deps.userRepository.findById).not.toHaveBeenCalled();
      expect(deps.userRepository.updatePasswordHash).not.toHaveBeenCalled();
      expect(deps.verifyTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });

    it('should throw error with code TOKEN_ALREADY_USED', async () => {
      // Arrange
      const tokenDoc = createValidTokenDoc({
        usedAt: new Date(),
      });
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);

      // Act & Assert
      try {
        await service.execute(VALID_TOKEN, VALID_PASSWORD);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenAlreadyUsedError);
        expect((error as TokenAlreadyUsedError).code).toBe('TOKEN_ALREADY_USED');
      }
    });
  });

  describe('Contraseña no cumple reglas → PasswordValidationError, token NO marcado', () => {
    it('should throw PasswordValidationError for weak password', async () => {
      // Arrange: valid token but invalid password
      const tokenDoc = createValidTokenDoc();
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);

      // Act & Assert
      await expect(service.execute(VALID_TOKEN, INVALID_PASSWORD)).rejects.toThrow(PasswordValidationError);

      // Assert: token NOT marked as used
      expect(deps.verifyTokenRepository.markAsUsed).not.toHaveBeenCalled();

      // Assert: password NOT updated
      expect(deps.userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('should include validation result with failed rules', async () => {
      // Arrange
      const tokenDoc = createValidTokenDoc();
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);

      // Act & Assert
      try {
        await service.execute(VALID_TOKEN, INVALID_PASSWORD);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PasswordValidationError);
        const validationError = error as PasswordValidationError;
        expect(validationError.code).toBe('VALIDATION_FAILED');
        expect(validationError.validationResult).toBeDefined();
        expect(validationError.validationResult.isValid).toBe(false);
        expect(validationError.validationResult.rules.some((r) => !r.passed)).toBe(true);
      }
    });

    it('should not look up user when password validation fails', async () => {
      // Arrange
      const tokenDoc = createValidTokenDoc();
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);

      // Act & Assert
      await expect(service.execute(VALID_TOKEN, INVALID_PASSWORD)).rejects.toThrow(PasswordValidationError);

      // Assert: user was NOT looked up (validation happens before user lookup)
      expect(deps.userRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Usuario no encontrado → TokenInvalidError', () => {
    it('should throw TokenInvalidError when user does not exist', async () => {
      // Arrange: valid token but user not found
      const tokenDoc = createValidTokenDoc();
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute(VALID_TOKEN, VALID_PASSWORD)).rejects.toThrow(TokenInvalidError);

      // Assert: password NOT updated, token NOT marked
      expect(deps.userRepository.updatePasswordHash).not.toHaveBeenCalled();
      expect(deps.verifyTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });
  });

  describe('Error de BD al actualizar → token NO marcado, hash preservado', () => {
    it('should throw Error and NOT mark token when updatePasswordHash returns false', async () => {
      // Arrange: valid token, valid password, user exists, but DB update fails
      const tokenDoc = createValidTokenDoc();
      (deps.verifyTokenRepository.findByTokenAndType as ReturnType<typeof vi.fn>).mockResolvedValue(tokenDoc);
      (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        passwordHash: 'old-hash',
      });
      (deps.userRepository.updatePasswordHash as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      // Act & Assert
      await expect(service.execute(VALID_TOKEN, VALID_PASSWORD)).rejects.toThrow(
        'No se pudo actualizar la contraseña. Intenta más tarde.',
      );

      // Assert: token NOT marked as used (preserving ability to retry)
      expect(deps.verifyTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });
  });
});
