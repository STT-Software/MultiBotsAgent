/**
 * Property-Based Tests para LoginService.
 *
 * Property 4: Email case-insensitive login
 * Property 5: Indistinguishable error for invalid credentials
 * Property 7: No tokens generated for pending_deletion company
 * Property 8: Single active session invariant
 * Property 9: ActiveSessionId consistency
 * Property 14: Successful login resets email rate limit (tested as: login returns tokens on success)
 *
 * Feature: flujo-2.2-autenticacion
 */
import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { LoginService } from '../login.service';
import type { LoginServiceDeps } from '../login.service';
import {
  InvalidCredentialsError,
  CompanyPendingDeletionError,
  CompanyStatus,
} from '@multibotagents/types';
import type { User, Company } from '@multibotagents/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashedpassword',
    emailVerified: true,
    companyId: 'company-456',
    activeSessionId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'company-456',
    name: 'Test Company',
    country: 'US',
    category: 'technology' as never,
    size: 'small' as never,
    status: CompanyStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockDeps(): LoginServiceDeps {
  return {
    userRepository: {
      findByEmail: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(undefined),
    },
    companyRepository: {
      findById: vi.fn().mockResolvedValue(createMockCompany()),
    },
    refreshTokenRepository: {
      revokeAllByUserId: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ id: 'token-id-1' }),
    },
    passwordService: {
      verify: vi.fn().mockResolvedValue(false),
      hash: vi.fn().mockResolvedValue('hashed'),
    } as never,
    tokenService: {
      generateAccessToken: vi.fn().mockReturnValue('mock-access-token-jwt'),
      generateRefreshToken: vi.fn().mockReturnValue('a'.repeat(128)),
      verifyAccessToken: vi.fn(),
      generateVerificationToken: vi.fn(),
    } as never,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Genera emails con casing arbitrario. */
const emailWithCasingArb = fc.tuple(
  fc.stringMatching(/^[a-zA-Z]{3,8}$/),
  fc.constantFrom('Example.COM', 'Test.ORG', 'Company.IO', 'mail.co'),
).map(([local, domain]) => `${local}@${domain}`);

/** Genera passwords arbitrarios. */
const passwordArb = fc.string({ minLength: 8, maxLength: 32 });

// ─── Property 4: Email case-insensitive login ────────────────────────────────

describe('Feature: flujo-2.2-autenticacion, Property 4: Email case-insensitive login', () => {
  /**
   * **Validates: Requirements 1.6**
   *
   * For any email string with arbitrary casing, the login service should normalize
   * it to lowercase before lookup, such that login("User@Example.COM", password)
   * finds the same user as login("user@example.com", password).
   */

  it('should normalize email to lowercase before repository lookup', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithCasingArb, passwordArb, async (email, password) => {
        const deps = createMockDeps();
        const user = createMockUser({ email: email.toLowerCase() });
        (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);

        const service = new LoginService(deps);
        await service.login(email, password);

        expect(deps.userRepository.findByEmail).toHaveBeenCalledWith(email.toLowerCase());
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: Indistinguishable error for invalid credentials ─────────────

describe('Feature: flujo-2.2-autenticacion, Property 5: Indistinguishable error for invalid credentials', () => {
  /**
   * **Validates: Requirements 2.1, 2.2**
   *
   * For any login attempt with either a non-existent email or a wrong password,
   * the system should throw the identical InvalidCredentialsError, making the two
   * cases indistinguishable to the caller.
   */

  it('should throw InvalidCredentialsError for non-existent email', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithCasingArb, passwordArb, async (email, password) => {
        const deps = createMockDeps();
        (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        const service = new LoginService(deps);

        try {
          await service.login(email, password);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidCredentialsError);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should throw InvalidCredentialsError for wrong password', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithCasingArb, passwordArb, async (email, password) => {
        const deps = createMockDeps();
        const user = createMockUser({ email: email.toLowerCase() });
        (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        const service = new LoginService(deps);

        try {
          await service.login(email, password);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidCredentialsError);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should throw same error type for both non-existent email and wrong password', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithCasingArb, passwordArb, async (email, password) => {
        const deps = createMockDeps();

        // Case 1: non-existent email
        (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        const service1 = new LoginService(deps);
        let error1: Error | null = null;
        try {
          await service1.login(email, password);
        } catch (e) {
          error1 = e as Error;
        }

        // Case 2: wrong password
        const deps2 = createMockDeps();
        const user = createMockUser({ email: email.toLowerCase() });
        (deps2.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps2.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        const service2 = new LoginService(deps2);
        let error2: Error | null = null;
        try {
          await service2.login(email, password);
        } catch (e) {
          error2 = e as Error;
        }

        // Both should be InvalidCredentialsError with same message
        expect(error1).toBeInstanceOf(InvalidCredentialsError);
        expect(error2).toBeInstanceOf(InvalidCredentialsError);
        expect(error1!.message).toBe(error2!.message);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: No tokens generated for pending_deletion company ────────────

describe('Feature: flujo-2.2-autenticacion, Property 7: No tokens generated for pending_deletion company', () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * For any user whose associated company has status pending_deletion, the login
   * service should never return an accessToken or refreshToken — it should fail
   * with CompanyPendingDeletionError.
   */

  it('should throw CompanyPendingDeletionError and never generate tokens', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithCasingArb, passwordArb, async (email, password) => {
        const deps = createMockDeps();
        const user = createMockUser({ email: email.toLowerCase() });
        const company = createMockCompany({
          status: CompanyStatus.PENDING_DELETION,
          deletionReqDate: new Date(),
        });

        (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (deps.companyRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(company);

        const service = new LoginService(deps);

        try {
          await service.login(email, password);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(CompanyPendingDeletionError);
        }

        // Token generation should never have been called
        expect(deps.tokenService.generateAccessToken).not.toHaveBeenCalled();
        expect(deps.tokenService.generateRefreshToken).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8: Single active session invariant ─────────────────────────────

describe('Feature: flujo-2.2-autenticacion, Property 8: Single active session invariant', () => {
  /**
   * **Validates: Requirements 4.1, 4.3**
   *
   * For any user, after any successful login operation, revokeAllByUserId is called
   * before creating a new token, ensuring at most one active session.
   */

  it('should call revokeAllByUserId before creating new refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithCasingArb, passwordArb, async (email, password) => {
        const deps = createMockDeps();
        const user = createMockUser({ email: email.toLowerCase() });

        (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);

        const callOrder: string[] = [];
        (deps.refreshTokenRepository.revokeAllByUserId as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          callOrder.push('revokeAll');
        });
        (deps.refreshTokenRepository.create as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          callOrder.push('create');
          return { id: 'new-token-id' };
        });

        const service = new LoginService(deps);
        await service.login(email, password);

        // revokeAll must be called before create
        expect(callOrder.indexOf('revokeAll')).toBeLessThan(callOrder.indexOf('create'));
        expect(deps.refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(user.id);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 9: ActiveSessionId consistency ─────────────────────────────────

describe('Feature: flujo-2.2-autenticacion, Property 9: ActiveSessionId consistency', () => {
  /**
   * **Validates: Requirements 4.2**
   *
   * For any user, after a successful login, the user document's activeSessionId
   * field should be updated with the first 32 characters of the new refresh token.
   */

  it('should update user activeSessionId with first 32 chars of refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithCasingArb, passwordArb, async (email, password) => {
        const deps = createMockDeps();
        const user = createMockUser({ email: email.toLowerCase() });
        const refreshToken = 'abcdef1234567890'.repeat(8); // 128 chars

        (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (deps.tokenService.generateRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue(refreshToken);

        const service = new LoginService(deps);
        await service.login(email, password);

        const expectedSessionId = refreshToken.substring(0, 32);
        expect(deps.userRepository.update).toHaveBeenCalledWith(user.id, {
          activeSessionId: expectedSessionId,
        });
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 14: Successful login returns tokens ────────────────────────────

describe('Feature: flujo-2.2-autenticacion, Property 14: Successful login resets email rate limit', () => {
  /**
   * **Validates: Requirements 6.6**
   *
   * For any valid credentials, a successful login should return both an access token
   * and a refresh token. (The rate limit reset is handled at the controller level;
   * at the service level we verify that login succeeds and returns tokens.)
   */

  it('should return accessToken and refreshToken on successful login', async () => {
    await fc.assert(
      fc.asyncProperty(emailWithCasingArb, passwordArb, async (email, password) => {
        const deps = createMockDeps();
        const user = createMockUser({ email: email.toLowerCase() });
        const mockAccessToken = 'jwt-access-token-value';
        const mockRefreshToken = 'b'.repeat(128);

        (deps.userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps.passwordService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (deps.tokenService.generateAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(mockAccessToken);
        (deps.tokenService.generateRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue(mockRefreshToken);

        const service = new LoginService(deps);
        const result = await service.login(email, password);

        expect(result.accessToken).toBe(mockAccessToken);
        expect(result.refreshToken).toBe(mockRefreshToken);
        expect(result.user.userId).toBe(user.id);
        expect(result.user.email).toBe(user.email);
        expect(result.user.companyId).toBe(user.companyId);
      }),
      { numRuns: 100 },
    );
  });
});
