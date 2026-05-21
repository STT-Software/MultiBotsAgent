/**
 * Property-Based Tests para RateLimitService.
 *
 * Property 6: Rate limit counter monotonic increment
 * Property 12: Rate limit blocking at threshold
 * Property 13: Rate limit key format
 * Property 15: Independent IP and email rate limit evaluation
 *
 * Feature: flujo-2.2-autenticacion
 */
import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { RateLimitService, ipKey, emailKey } from '../rate-limit.service';
import { RateLimitExceededError } from '@multibotagents/types';
import type { IRateLimitRepository, RateLimitRecord } from '@multibotagents/types';

// ─── Mock Repository ─────────────────────────────────────────────────────────

function createMockRepo(): IRateLimitRepository {
  return {
    findByKey: vi.fn().mockResolvedValue(null),
    upsertAttempt: vi.fn().mockImplementation(
      async (key: string, windowMs: number): Promise<RateLimitRecord> => ({
        id: 'mock-id',
        key,
        attempts: 1,
        blockedUntil: null,
        expiresAt: new Date(Date.now() + windowMs),
        createdAt: new Date(),
      }),
    ),
    resetByKey: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Genera direcciones IP válidas. */
const ipArb = fc.tuple(
  fc.integer({ min: 1, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 1, max: 254 }),
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/** Genera emails válidos. */
const emailArb = fc.tuple(
  fc.stringMatching(/^[a-z]{3,10}$/),
  fc.constantFrom('example.com', 'test.org', 'company.io', 'mail.co'),
).map(([local, domain]) => `${local}@${domain}`);

// ─── Property 6: Rate limit counter monotonic increment ──────────────────────

describe('Feature: flujo-2.2-autenticacion, Property 6: Rate limit counter monotonic increment', () => {
  /**
   * For any IP or email key, each call to recordFailedAttempt should increment
   * the attempts counter by exactly 1, up to the blocking threshold.
   *
   * Validates: Requirements 2.4
   */

  it('should call upsertAttempt for both IP and email on each failed attempt', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        const service = new RateLimitService(repo);

        await service.recordFailedAttempt(ip, email);

        expect(repo.upsertAttempt).toHaveBeenCalledTimes(2);
        expect(repo.upsertAttempt).toHaveBeenCalledWith(
          `ip:${ip}`,
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
        );
        expect(repo.upsertAttempt).toHaveBeenCalledWith(
          `email:${email}`,
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('should pass correct config values to upsertAttempt for IP', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        const service = new RateLimitService(repo);

        await service.recordFailedAttempt(ip, email);

        const ipCall = (repo.upsertAttempt as ReturnType<typeof vi.fn>).mock.calls.find(
          (call: unknown[]) => (call[0] as string).startsWith('ip:'),
        );
        expect(ipCall).toBeDefined();
        expect(ipCall![1]).toBe(60_000);
        expect(ipCall![2]).toBe(300_000);
        expect(ipCall![3]).toBe(5);
      }),
      { numRuns: 100 },
    );
  });

  it('should pass correct config values to upsertAttempt for email', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        const service = new RateLimitService(repo);

        await service.recordFailedAttempt(ip, email);

        const emailCall = (repo.upsertAttempt as ReturnType<typeof vi.fn>).mock.calls.find(
          (call: unknown[]) => (call[0] as string).startsWith('email:'),
        );
        expect(emailCall).toBeDefined();
        expect(emailCall![1]).toBe(600_000);
        expect(emailCall![2]).toBe(900_000);
        expect(emailCall![3]).toBe(10);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: Rate limit blocking at threshold ───────────────────────────

describe('Feature: flujo-2.2-autenticacion, Property 12: Rate limit blocking at threshold', () => {
  /**
   * For any rate limit key (IP or email), after exactly maxAttempts failed attempts
   * within the configured time window, the next check should indicate the key is blocked.
   * Before reaching the threshold, attempts should be allowed.
   *
   * Validates: Requirements 6.1, 6.2
   */

  it('should not throw when IP is not blocked', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        (repo.findByKey as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
          if (key.startsWith('ip:')) {
            return { id: '1', key, attempts: 3, blockedUntil: null, expiresAt: new Date(Date.now() + 60_000), createdAt: new Date() };
          }
          return null;
        });

        const service = new RateLimitService(repo);
        await service.checkRateLimit(ip, email);
        // If we reach here without throwing, the test passes
      }),
      { numRuns: 100 },
    );
  });

  it('should throw RateLimitExceededError when IP is blocked', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        const blockedUntil = new Date(Date.now() + 300_000);
        (repo.findByKey as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
          if (key.startsWith('ip:')) {
            return { id: '1', key, attempts: 5, blockedUntil, expiresAt: new Date(Date.now() + 360_000), createdAt: new Date() };
          }
          return null;
        });

        const service = new RateLimitService(repo);
        try {
          await service.checkRateLimit(ip, email);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RateLimitExceededError);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should throw RateLimitExceededError when email is blocked', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        const blockedUntil = new Date(Date.now() + 900_000);
        (repo.findByKey as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
          if (key.startsWith('email:')) {
            return { id: '1', key, attempts: 10, blockedUntil, expiresAt: new Date(Date.now() + 960_000), createdAt: new Date() };
          }
          return null;
        });

        const service = new RateLimitService(repo);
        try {
          await service.checkRateLimit(ip, email);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RateLimitExceededError);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should include retryAfterSeconds in the error', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipArb,
        emailArb,
        fc.integer({ min: 10, max: 300 }),
        async (ip, email, secondsRemaining) => {
          const repo = createMockRepo();
          const blockedUntil = new Date(Date.now() + secondsRemaining * 1000);
          (repo.findByKey as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
            if (key.startsWith('ip:')) {
              return { id: '1', key, attempts: 5, blockedUntil, expiresAt: new Date(Date.now() + 360_000), createdAt: new Date() };
            }
            return null;
          });

          const service = new RateLimitService(repo);
          try {
            await service.checkRateLimit(ip, email);
            throw new Error('Should have thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(RateLimitExceededError);
            expect((error as RateLimitExceededError).retryAfterSeconds).toBeGreaterThan(0);
            expect((error as RateLimitExceededError).retryAfterSeconds).toBeLessThanOrEqual(secondsRemaining);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not block when blockedUntil is in the past', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        const blockedUntil = new Date(Date.now() - 1000);
        (repo.findByKey as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
          if (key.startsWith('ip:')) {
            return { id: '1', key, attempts: 5, blockedUntil, expiresAt: new Date(Date.now() + 60_000), createdAt: new Date() };
          }
          return null;
        });

        const service = new RateLimitService(repo);
        await service.checkRateLimit(ip, email);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13: Rate limit key format ──────────────────────────────────────

describe('Feature: flujo-2.2-autenticacion, Property 13: Rate limit key format', () => {
  /**
   * For any IP address string addr, the rate limit key should be "ip:<addr>".
   * For any email string e, the rate limit key should be "email:<e>".
   *
   * Validates: Requirements 6.4
   */

  it('should format IP keys as "ip:<addr>"', () => {
    fc.assert(
      fc.property(ipArb, (ip) => {
        expect(ipKey(ip)).toBe(`ip:${ip}`);
      }),
      { numRuns: 100 },
    );
  });

  it('should format email keys as "email:<email>"', () => {
    fc.assert(
      fc.property(emailArb, (email) => {
        expect(emailKey(email)).toBe(`email:${email}`);
      }),
      { numRuns: 100 },
    );
  });

  it('should use correct key format when recording failed attempts', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        const service = new RateLimitService(repo);

        await service.recordFailedAttempt(ip, email);

        const calls = (repo.upsertAttempt as ReturnType<typeof vi.fn>).mock.calls;
        const keys = calls.map((call: unknown[]) => call[0]);
        expect(keys).toContain(`ip:${ip}`);
        expect(keys).toContain(`email:${email}`);
      }),
      { numRuns: 100 },
    );
  });

  it('should use correct key format when checking rate limit', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        const service = new RateLimitService(repo);

        await service.checkRateLimit(ip, email);

        const calls = (repo.findByKey as ReturnType<typeof vi.fn>).mock.calls;
        const keys = calls.map((call: unknown[]) => call[0]);
        expect(keys).toContain(`ip:${ip}`);
        expect(keys).toContain(`email:${email}`);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 15: Independent IP and email rate limit evaluation ─────────────

describe('Feature: flujo-2.2-autenticacion, Property 15: Independent IP and email rate limit evaluation', () => {
  /**
   * For any combination of IP and email rate limit states, the login attempt should
   * be blocked if either the IP key OR the email key is in blocked state.
   * Both must be unblocked for the attempt to proceed.
   *
   * Validates: Requirements 6.7
   */

  it('should allow when both IP and email are unblocked', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        const service = new RateLimitService(repo);
        await service.checkRateLimit(ip, email);
      }),
      { numRuns: 100 },
    );
  });

  it('should block when only IP is blocked (email unblocked)', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        (repo.findByKey as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
          if (key.startsWith('ip:')) {
            return { id: '1', key, attempts: 5, blockedUntil: new Date(Date.now() + 300_000), expiresAt: new Date(Date.now() + 360_000), createdAt: new Date() };
          }
          return null;
        });

        const service = new RateLimitService(repo);
        try {
          await service.checkRateLimit(ip, email);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RateLimitExceededError);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should block when only email is blocked (IP unblocked)', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        (repo.findByKey as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
          if (key.startsWith('email:')) {
            return { id: '1', key, attempts: 10, blockedUntil: new Date(Date.now() + 900_000), expiresAt: new Date(Date.now() + 960_000), createdAt: new Date() };
          }
          return null;
        });

        const service = new RateLimitService(repo);
        try {
          await service.checkRateLimit(ip, email);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RateLimitExceededError);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should block when both IP and email are blocked', async () => {
    await fc.assert(
      fc.asyncProperty(ipArb, emailArb, async (ip, email) => {
        const repo = createMockRepo();
        (repo.findByKey as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
          if (key.startsWith('ip:')) {
            return { id: '1', key, attempts: 5, blockedUntil: new Date(Date.now() + 300_000), expiresAt: new Date(Date.now() + 360_000), createdAt: new Date() };
          }
          if (key.startsWith('email:')) {
            return { id: '2', key, attempts: 10, blockedUntil: new Date(Date.now() + 900_000), expiresAt: new Date(Date.now() + 960_000), createdAt: new Date() };
          }
          return null;
        });

        const service = new RateLimitService(repo);
        try {
          await service.checkRateLimit(ip, email);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RateLimitExceededError);
        }
      }),
      { numRuns: 100 },
    );
  });
});
