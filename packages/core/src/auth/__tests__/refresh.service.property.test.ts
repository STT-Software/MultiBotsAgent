/**
 * Property-Based Tests para RefreshService.
 *
 * Property 10: Valid refresh produces correct access token
 * Property 11: Refresh fails for inactive company
 *
 * Feature: flujo-2.2-autenticacion
 */
import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { RefreshService } from '../refresh.service';
import type { RefreshServiceDeps } from '../refresh.service';
import {
  CompanyInactiveError,
  CompanyStatus,
} from '@multibotagents/types';
import type { User, Company, RefreshToken } from '@multibotagents/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockRefreshToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: 'rt-id-1',
    userId: 'user-123',
    token: 'a'.repeat(128),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    revoked: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashedpassword',
    emailVerified: true,
    companyId: 'company-456',
    activeSessionId: 'session-abc',
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

function createMockDeps(): RefreshServiceDeps {
  return {
    refreshTokenRepository: {
      findByToken: vi.fn().mockResolvedValue(null),
    },
    userRepository: {
      findById: vi.fn().mockResolvedValue(null),
    },
    companyRepository: {
      findById: vi.fn().mockResolvedValue(null),
    },
    tokenService: {
      generateAccessToken: vi.fn().mockReturnValue('mock-new-access-token'),
      generateRefreshToken: vi.fn(),
      verifyAccessToken: vi.fn(),
      generateVerificationToken: vi.fn(),
    } as never,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Genera refresh token values (128 hex chars). */
const refreshTokenValueArb = fc.stringMatching(/^[0-9a-f]{128}$/);

/** Genera user IDs. */
const userIdArb = fc.uuid();

/** Genera emails válidos. */
const emailArb = fc.tuple(
  fc.stringMatching(/^[a-z]{3,10}$/),
  fc.constantFrom('example.com', 'test.org', 'company.io'),
).map(([local, domain]) => `${local}@${domain}`);

/** Genera company IDs. */
const companyIdArb = fc.uuid();

/** Genera payloads de usuario para refresh. */
const userDataArb = fc.record({
  userId: userIdArb,
  email: emailArb,
  companyId: companyIdArb,
  emailVerified: fc.boolean(),
});

// ─── Property 10: Valid refresh produces correct access token ─────────────────

describe('Feature: flujo-2.2-autenticacion, Property 10: Valid refresh produces correct access token', () => {
  /**
   * **Validates: Requirements 5.2, 5.5**
   *
   * For any valid (non-revoked, non-expired) refresh token belonging to a user with
   * an active company, calling the refresh service should produce a new access token
   * with claims matching the current user data (userId, companyId, email, emailVerified).
   */

  it('should produce access token with correct claims for valid refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(refreshTokenValueArb, userDataArb, async (tokenValue, userData) => {
        const deps = createMockDeps();

        const refreshToken = createMockRefreshToken({
          userId: userData.userId,
          token: tokenValue,
          revoked: false,
          expiresAt: new Date(Date.now() + 3600_000), // not expired
        });

        const user = createMockUser({
          id: userData.userId,
          email: userData.email,
          companyId: userData.companyId,
          emailVerified: userData.emailVerified,
        });

        const company = createMockCompany({
          id: userData.companyId,
          status: CompanyStatus.ACTIVE,
        });

        (deps.refreshTokenRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue(refreshToken);
        (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps.companyRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(company);

        const service = new RefreshService(deps);
        const result = await service.refresh(tokenValue);

        // Should return an access token
        expect(result.accessToken).toBeDefined();
        expect(typeof result.accessToken).toBe('string');

        // Should have called generateAccessToken with correct payload
        expect(deps.tokenService.generateAccessToken).toHaveBeenCalledWith({
          userId: userData.userId,
          companyId: userData.companyId,
          email: userData.email,
          emailVerified: userData.emailVerified,
          companyName: company.name,
        });
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: Refresh fails for inactive company ─────────────────────────

describe('Feature: flujo-2.2-autenticacion, Property 11: Refresh fails for inactive company', () => {
  /**
   * **Validates: Requirements 5.6, 12.1**
   *
   * For any valid refresh token belonging to a user whose company status is not
   * 'active', the refresh service should reject the request with CompanyInactiveError.
   */

  it('should throw CompanyInactiveError when company status is pending_deletion', async () => {
    await fc.assert(
      fc.asyncProperty(refreshTokenValueArb, userDataArb, async (tokenValue, userData) => {
        const deps = createMockDeps();

        const refreshToken = createMockRefreshToken({
          userId: userData.userId,
          token: tokenValue,
          revoked: false,
          expiresAt: new Date(Date.now() + 3600_000),
        });

        const user = createMockUser({
          id: userData.userId,
          email: userData.email,
          companyId: userData.companyId,
          emailVerified: userData.emailVerified,
        });

        const company = createMockCompany({
          id: userData.companyId,
          status: CompanyStatus.PENDING_DELETION,
        });

        (deps.refreshTokenRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue(refreshToken);
        (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps.companyRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(company);

        const service = new RefreshService(deps);

        try {
          await service.refresh(tokenValue);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(CompanyInactiveError);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should throw CompanyInactiveError when company is null (not found)', async () => {
    await fc.assert(
      fc.asyncProperty(refreshTokenValueArb, userDataArb, async (tokenValue, userData) => {
        const deps = createMockDeps();

        const refreshToken = createMockRefreshToken({
          userId: userData.userId,
          token: tokenValue,
          revoked: false,
          expiresAt: new Date(Date.now() + 3600_000),
        });

        const user = createMockUser({
          id: userData.userId,
          email: userData.email,
          companyId: userData.companyId,
          emailVerified: userData.emailVerified,
        });

        (deps.refreshTokenRepository.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue(refreshToken);
        (deps.userRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);
        (deps.companyRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const service = new RefreshService(deps);

        try {
          await service.refresh(tokenValue);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(CompanyInactiveError);
        }
      }),
      { numRuns: 100 },
    );
  });
});
