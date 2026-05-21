/**
 * Property-Based Tests para LogoutService.
 *
 * Property 18: Logout revokes active refresh token
 *
 * Feature: flujo-2.2-autenticacion
 */
import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { LogoutService } from '../logout.service';
import type { LogoutServiceDeps } from '../logout.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockDeps(): LogoutServiceDeps {
  return {
    refreshTokenRepository: {
      revokeAllByUserId: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Genera user IDs arbitrarios. */
const userIdArb = fc.uuid();

// ─── Property 18: Logout revokes active refresh token ────────────────────────

describe('Feature: flujo-2.2-autenticacion, Property 18: Logout revokes active refresh token', () => {
  /**
   * **Validates: Requirements 8.1**
   *
   * For any userId, logout calls revokeAllByUserId with that userId,
   * ensuring all active refresh tokens for the user are revoked.
   */

  it('should call revokeAllByUserId with the provided userId', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        const deps = createMockDeps();
        const service = new LogoutService(deps);

        await service.logout(userId);

        expect(deps.refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledTimes(1);
        expect(deps.refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(userId);
      }),
      { numRuns: 100 },
    );
  });

  it('should complete without error for any valid userId', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        const deps = createMockDeps();
        const service = new LogoutService(deps);

        // Should not throw
        await expect(service.logout(userId)).resolves.toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});
