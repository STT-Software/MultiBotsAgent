/**
 * Property-Based Tests para ChangePasswordService.
 *
 * Property 2: Rechazo de contraseña idéntica a la actual
 * Property 4: Aplicación de rate limiting
 * Property 8: Rechazo de contraseña actual incorrecta
 * Property 9: Generación correcta de hash bcrypt
 *
 * Feature: password-change
 */
import * as fc from "fast-check";
import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";
import { ChangePasswordService } from "../change-password.service";
import { PasswordService } from "../password.service";
import type { IChangePasswordUserRepository } from "../interfaces/change-password.interfaces";
import {
  InvalidCurrentPasswordError,
  SameAsCurrentError,
  RateLimitExceededError,
} from "../interfaces/change-password.interfaces";
import type { IRateLimitRepository, RateLimitRecord } from "@multibotagents/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Genera un arbitrary de contraseña válida (cumple todas las reglas). */
const validPasswordArb = fc
  .tuple(
    fc.stringMatching(/^[A-Z]$/),
    fc.stringMatching(/^[a-z]$/),
    fc.stringMatching(/^\d$/),
    fc.constantFrom("!", "@", "#", "$", "%", "^", "&", "*"),
    fc.stringMatching(/^[a-zA-Z0-9]{4,50}$/),
  )
  .map(
    ([upper, lower, digit, special, rest]) =>
      upper + lower + digit + special + rest,
  );

/** Genera un userId aleatorio. */
const userIdArb = fc.stringMatching(/^[a-f0-9]{24}$/);

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockUserRepository(): IChangePasswordUserRepository {
  return {
    findById: vi.fn(),
    updatePasswordHash: vi.fn(),
  };
}

function createMockRateLimitRepository(): IRateLimitRepository {
  return {
    findByKey: vi.fn(),
    upsertAttempt: vi.fn(),
    resetByKey: vi.fn(),
  };
}

// ─── Property 2: Rechazo de contraseña idéntica a la actual ──────────────────

describe("Feature: password-change, Property 2: Rechazo de contraseña idéntica a la actual", () => {
  /**
   * **Validates: Requirements 4.8**
   *
   * For any valid password P and a user whose stored hash corresponds to P,
   * when attempting to change providing P as new password, the service SHALL
   * reject with code SAME_AS_CURRENT without modifying the stored hash.
   */

  it("rechaza con SAME_AS_CURRENT cuando la nueva contraseña es idéntica a la actual", async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, userIdArb, async (password, userId) => {
        const mockUserRepo = createMockUserRepository();
        const mockRateLimitRepo = createMockRateLimitRepository();

        // Pre-compute hash for the password (use low cost for speed in tests)
        const storedHash = await bcrypt.hash(password, 4);

        (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: userId,
          passwordHash: storedHash,
        });
        (mockUserRepo.updatePasswordHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (mockRateLimitRepo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (mockRateLimitRepo.upsertAttempt as ReturnType<typeof vi.fn>).mockResolvedValue({} as RateLimitRecord);
        (mockRateLimitRepo.resetByKey as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        // Mock passwordService.verify to use the real bcrypt compare
        // but mock passwordService.hash to avoid cost factor 12 overhead
        const mockPasswordService = {
          verify: (plain: string, hash: string) => bcrypt.compare(plain, hash),
          hash: (plain: string) => bcrypt.hash(plain, 4),
        } as unknown as PasswordService;

        const service = new ChangePasswordService({
          userRepository: mockUserRepo,
          passwordService: mockPasswordService,
          rateLimitRepository: mockRateLimitRepo,
        });

        // Attempt to change password to the same value
        try {
          await service.execute(userId, password, password);
          // Should not reach here
          return false;
        } catch (e) {
          expect(e).toBeInstanceOf(SameAsCurrentError);
          // Hash should NOT have been updated
          expect(mockUserRepo.updatePasswordHash).not.toHaveBeenCalled();
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 4: Aplicación de rate limiting ─────────────────────────────────

describe("Feature: password-change, Property 4: Aplicación de rate limiting", () => {
  /**
   * **Validates: Requirements 3.5, 9.7**
   *
   * For any userId, if N > 5 failed attempts within 15 minutes, service SHALL
   * reject all subsequent attempts until block period expires. For N ≤ 5, SHALL allow.
   */

  it("rechaza con RateLimitExceededError cuando el usuario está bloqueado (blockedUntil en el futuro)", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.integer({ min: 1, max: 900 }),
        async (userId, retrySeconds) => {
          const mockUserRepo = createMockUserRepository();
          const mockRateLimitRepo = createMockRateLimitRepository();
          const passwordService = new PasswordService();

          const futureDate = new Date(Date.now() + retrySeconds * 1000);

          (mockRateLimitRepo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "some-id",
            key: `change-pwd:${userId}`,
            attempts: 6,
            blockedUntil: futureDate,
            expiresAt: futureDate,
            createdAt: new Date(),
          } as RateLimitRecord);

          const service = new ChangePasswordService({
            userRepository: mockUserRepo,
            passwordService,
            rateLimitRepository: mockRateLimitRepo,
          });

          try {
            await service.execute(userId, "AnyPassword1!", "NewPassword1!");
            return false; // Should have thrown
          } catch (e) {
            expect(e).toBeInstanceOf(RateLimitExceededError);
            // Should not attempt to find user or update password
            expect(mockUserRepo.findById).not.toHaveBeenCalled();
            expect(mockUserRepo.updatePasswordHash).not.toHaveBeenCalled();
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("permite el intento cuando no hay registro de rate limit (null)", async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        const mockUserRepo = createMockUserRepository();
        const mockRateLimitRepo = createMockRateLimitRepository();
        const passwordService = new PasswordService();

        (mockRateLimitRepo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        // User not found - will throw UserNotFoundError, but NOT RateLimitExceededError
        (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const service = new ChangePasswordService({
          userRepository: mockUserRepo,
          passwordService,
          rateLimitRepository: mockRateLimitRepo,
        });

        try {
          await service.execute(userId, "AnyPass1!", "NewPass1!");
          return false; // Should throw (UserNotFoundError)
        } catch (e) {
          // The key assertion: it should NOT be a RateLimitExceededError
          expect(e).not.toBeInstanceOf(RateLimitExceededError);
          // It should have proceeded past rate limit to find user
          expect(mockUserRepo.findById).toHaveBeenCalled();
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });

  it("permite el intento cuando blockedUntil está en el pasado (bloqueo expirado)", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.integer({ min: 1, max: 3600 }),
        async (userId, secondsAgo) => {
          const mockUserRepo = createMockUserRepository();
          const mockRateLimitRepo = createMockRateLimitRepository();
          const passwordService = new PasswordService();

          const pastDate = new Date(Date.now() - secondsAgo * 1000);

          (mockRateLimitRepo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "some-id",
            key: `change-pwd:${userId}`,
            attempts: 6,
            blockedUntil: pastDate,
            expiresAt: new Date(Date.now() + 60000),
            createdAt: new Date(),
          } as RateLimitRecord);
          (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

          const service = new ChangePasswordService({
            userRepository: mockUserRepo,
            passwordService,
            rateLimitRepository: mockRateLimitRepo,
          });

          try {
            await service.execute(userId, "AnyPass1!", "NewPass1!");
            return false;
          } catch (e) {
            // Should NOT be rate limited - block has expired
            expect(e).not.toBeInstanceOf(RateLimitExceededError);
            // Should have proceeded past rate limit check
            expect(mockUserRepo.findById).toHaveBeenCalled();
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("permite el intento cuando blockedUntil es null (no bloqueado)", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.integer({ min: 1, max: 5 }),
        async (userId, attempts) => {
          const mockUserRepo = createMockUserRepository();
          const mockRateLimitRepo = createMockRateLimitRepository();
          const passwordService = new PasswordService();

          (mockRateLimitRepo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "some-id",
            key: `change-pwd:${userId}`,
            attempts,
            blockedUntil: null,
            expiresAt: new Date(Date.now() + 60000),
            createdAt: new Date(),
          } as RateLimitRecord);
          (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

          const service = new ChangePasswordService({
            userRepository: mockUserRepo,
            passwordService,
            rateLimitRepository: mockRateLimitRepo,
          });

          try {
            await service.execute(userId, "AnyPass1!", "NewPass1!");
            return false;
          } catch (e) {
            // Should NOT be rate limited
            expect(e).not.toBeInstanceOf(RateLimitExceededError);
            // Should have proceeded past rate limit check
            expect(mockUserRepo.findById).toHaveBeenCalled();
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8: Rechazo de contraseña actual incorrecta ─────────────────────

describe("Feature: password-change, Property 8: Rechazo de contraseña actual incorrecta", () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * For any user with stored hash H and any string P where bcrypt.compare(P, H) === false,
   * service SHALL return INVALID_CURRENT_PASSWORD error without modifying hash,
   * and SHALL increment failed attempts counter.
   */

  it("rechaza con INVALID_CURRENT_PASSWORD cuando la contraseña actual no coincide con el hash", async () => {
    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        validPasswordArb,
        userIdArb,
        async (storedPassword, wrongPassword, userId) => {
          // Ensure the passwords are different
          fc.pre(storedPassword !== wrongPassword);

          const mockUserRepo = createMockUserRepository();
          const mockRateLimitRepo = createMockRateLimitRepository();

          const storedHash = await bcrypt.hash(storedPassword, 4);

          (mockRateLimitRepo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
          (mockRateLimitRepo.upsertAttempt as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "some-id",
            key: `change-pwd:${userId}`,
            attempts: 1,
            blockedUntil: null,
            expiresAt: new Date(Date.now() + 900000),
            createdAt: new Date(),
          } as RateLimitRecord);
          (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: userId,
            passwordHash: storedHash,
          });

          const mockPasswordService = {
            verify: (plain: string, hash: string) => bcrypt.compare(plain, hash),
            hash: (plain: string) => bcrypt.hash(plain, 4),
          } as unknown as PasswordService;

          const service = new ChangePasswordService({
            userRepository: mockUserRepo,
            passwordService: mockPasswordService,
            rateLimitRepository: mockRateLimitRepo,
          });

          try {
            await service.execute(userId, wrongPassword, "NewValidPass1!");
            return false; // Should have thrown
          } catch (e) {
            expect(e).toBeInstanceOf(InvalidCurrentPasswordError);
            // Hash should NOT have been updated
            expect(mockUserRepo.updatePasswordHash).not.toHaveBeenCalled();
            return true;
          }
        },
      ),
      { numRuns: 20 }, // Reduced due to bcrypt cost
    );
  });

  it("incrementa el contador de intentos fallidos cuando la contraseña actual es incorrecta", async () => {
    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        validPasswordArb,
        userIdArb,
        async (storedPassword, wrongPassword, userId) => {
          fc.pre(storedPassword !== wrongPassword);

          const mockUserRepo = createMockUserRepository();
          const mockRateLimitRepo = createMockRateLimitRepository();

          const storedHash = await bcrypt.hash(storedPassword, 4);

          (mockRateLimitRepo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
          (mockRateLimitRepo.upsertAttempt as ReturnType<typeof vi.fn>).mockResolvedValue({} as RateLimitRecord);
          (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: userId,
            passwordHash: storedHash,
          });

          const mockPasswordService = {
            verify: (plain: string, hash: string) => bcrypt.compare(plain, hash),
            hash: (plain: string) => bcrypt.hash(plain, 4),
          } as unknown as PasswordService;

          const service = new ChangePasswordService({
            userRepository: mockUserRepo,
            passwordService: mockPasswordService,
            rateLimitRepository: mockRateLimitRepo,
          });

          try {
            await service.execute(userId, wrongPassword, "NewValidPass1!");
          } catch {
            // Expected to throw
          }

          // upsertAttempt should have been called to record the failed attempt
          expect(mockRateLimitRepo.upsertAttempt).toHaveBeenCalledWith(
            `change-pwd:${userId}`,
            900_000,
            900_000,
            5,
          );
          return true;
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ─── Property 9: Generación correcta de hash bcrypt ──────────────────────────

describe("Feature: password-change, Property 9: Generación correcta de hash bcrypt", () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * For any valid password P that passes all validations, when change executes
   * successfully, the new stored hash SHALL be a valid bcrypt hash with cost
   * factor 12, and bcrypt.compare(P, newHash) SHALL return true.
   */

  it("genera un hash bcrypt válido con cost factor 12 para cualquier contraseña válida", async () => {
    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        validPasswordArb,
        userIdArb,
        async (currentPassword, newPassword, userId) => {
          // Ensure passwords are different
          fc.pre(currentPassword !== newPassword);

          const mockUserRepo = createMockUserRepository();
          const mockRateLimitRepo = createMockRateLimitRepository();

          const storedHash = await bcrypt.hash(currentPassword, 4);
          let capturedNewHash: string | null = null;

          (mockRateLimitRepo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
          (mockRateLimitRepo.resetByKey as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
          (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: userId,
            passwordHash: storedHash,
          });
          (mockUserRepo.updatePasswordHash as ReturnType<typeof vi.fn>).mockImplementation(
            async (_userId: string, newHash: string) => {
              capturedNewHash = newHash;
              return true;
            },
          );

          // Use real PasswordService for hash (cost factor 12) but mock verify with low cost
          const realPasswordService = new PasswordService();
          const mockPasswordService = {
            verify: (plain: string, hash: string) => bcrypt.compare(plain, hash),
            hash: (plain: string) => realPasswordService.hash(plain),
          } as unknown as PasswordService;

          const service = new ChangePasswordService({
            userRepository: mockUserRepo,
            passwordService: mockPasswordService,
            rateLimitRepository: mockRateLimitRepo,
          });

          await service.execute(userId, currentPassword, newPassword);

          // Verify hash was stored
          expect(capturedNewHash).not.toBeNull();

          // Verify it's a valid bcrypt hash with cost factor 12
          // bcrypt hash format: $2a$12$... or $2b$12$...
          expect(capturedNewHash!).toMatch(/^\$2[aby]?\$12\$/);

          // Verify the hash corresponds to the new password
          const matches = await bcrypt.compare(newPassword, capturedNewHash!);
          expect(matches).toBe(true);

          return true;
        },
      ),
      { numRuns: 5 }, // Reduced due to bcrypt cost factor 12
    );
  });

  it("el hash generado NO coincide con la contraseña anterior", async () => {
    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        validPasswordArb,
        userIdArb,
        async (currentPassword, newPassword, userId) => {
          fc.pre(currentPassword !== newPassword);

          const mockUserRepo = createMockUserRepository();
          const mockRateLimitRepo = createMockRateLimitRepository();

          const storedHash = await bcrypt.hash(currentPassword, 4);
          let capturedNewHash: string | null = null;

          (mockRateLimitRepo.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);
          (mockRateLimitRepo.resetByKey as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
          (mockUserRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: userId,
            passwordHash: storedHash,
          });
          (mockUserRepo.updatePasswordHash as ReturnType<typeof vi.fn>).mockImplementation(
            async (_userId: string, newHash: string) => {
              capturedNewHash = newHash;
              return true;
            },
          );

          const realPasswordService = new PasswordService();
          const mockPasswordService = {
            verify: (plain: string, hash: string) => bcrypt.compare(plain, hash),
            hash: (plain: string) => realPasswordService.hash(plain),
          } as unknown as PasswordService;

          const service = new ChangePasswordService({
            userRepository: mockUserRepo,
            passwordService: mockPasswordService,
            rateLimitRepository: mockRateLimitRepo,
          });

          await service.execute(userId, currentPassword, newPassword);

          // The new hash should NOT match the old password
          const matchesOld = await bcrypt.compare(currentPassword, capturedNewHash!);
          expect(matchesOld).toBe(false);

          return true;
        },
      ),
      { numRuns: 5 },
    );
  });
});
