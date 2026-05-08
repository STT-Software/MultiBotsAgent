/**
 * Property-Based Tests para TokenService.
 *
 * Property 4: Generación correcta de JWT
 * Property 5: Formato de tokens criptográficos
 *
 * Feature: flujo-2.1-registro-empresa-usuario
 */
import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { TokenService } from '../token.service';
import type { AccessTokenPayload } from '@multibotagents/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const TEST_SECRET_1 = 'test-secret-primary-key-for-jwt-signing';
const TEST_SECRET_2 = 'test-secret-previous-key-for-rotation';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Genera payloads de AccessToken válidos. */
const accessTokenPayloadArb = fc.record({
  userId: fc.uuid(),
  companyId: fc.uuid(),
  email: fc.tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.constantFrom('example.com', 'test.org', 'company.io'),
  ).map(([local, domain]) => `${local}@${domain}`),
  emailVerified: fc.boolean(),
});

// ─── Property 4: Generación correcta de JWT ──────────────────────────────────

describe('Property 4: Generación correcta de JWT', () => {
  /**
   * **Validates: Requirements 5.1, 10.3**
   *
   * For any usuario registrado exitosamente, el Access Token JWT generado SHALL
   * contener los claims userId, companyId, email y emailVerified con valores correctos,
   * SHALL tener expiración de 30 minutos, y SHALL estar firmado con el primer secret
   * del array de secrets configurado.
   */

  const tokenService = new TokenService({ secrets: [TEST_SECRET_1, TEST_SECRET_2] });

  it('should generate JWT with correct claims for any valid payload', () => {
    fc.assert(
      fc.property(accessTokenPayloadArb, (payload) => {
        const token = tokenService.generateAccessToken(payload);

        // Decode without verification to inspect claims
        const decoded = jwt.decode(token) as Record<string, unknown>;

        expect(decoded.userId).toBe(payload.userId);
        expect(decoded.companyId).toBe(payload.companyId);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.emailVerified).toBe(payload.emailVerified);
      }),
      { numRuns: 100 },
    );
  });

  it('should set expiration to 30 minutes for any generated token', () => {
    fc.assert(
      fc.property(accessTokenPayloadArb, (payload) => {
        const token = tokenService.generateAccessToken(payload);
        const decoded = jwt.decode(token) as { iat: number; exp: number };

        const expirationSeconds = decoded.exp - decoded.iat;
        // 30 minutes = 1800 seconds
        expect(expirationSeconds).toBe(1800);
      }),
      { numRuns: 100 },
    );
  });

  it('should sign with the first secret (verifiable with first secret only)', () => {
    fc.assert(
      fc.property(accessTokenPayloadArb, (payload) => {
        const token = tokenService.generateAccessToken(payload);

        // Should verify with first secret
        const verified = jwt.verify(token, TEST_SECRET_1, { algorithms: ['HS256'] }) as AccessTokenPayload;
        expect(verified.userId).toBe(payload.userId);

        // Should NOT verify with a completely different secret
        expect(() => jwt.verify(token, 'wrong-secret', { algorithms: ['HS256'] })).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('should use HS256 algorithm for any generated token', () => {
    fc.assert(
      fc.property(accessTokenPayloadArb, (payload) => {
        const token = tokenService.generateAccessToken(payload);
        const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
        expect(header.alg).toBe('HS256');
      }),
      { numRuns: 100 },
    );
  });

  it('should round-trip: verifyAccessToken returns original payload', () => {
    fc.assert(
      fc.property(accessTokenPayloadArb, (payload) => {
        const token = tokenService.generateAccessToken(payload);
        const verified = tokenService.verifyAccessToken(token);

        expect(verified.userId).toBe(payload.userId);
        expect(verified.companyId).toBe(payload.companyId);
        expect(verified.email).toBe(payload.email);
        expect(verified.emailVerified).toBe(payload.emailVerified);
      }),
      { numRuns: 100 },
    );
  });

  it('should support secret rotation: tokens signed with previous secret are still valid', () => {
    // Service with rotated secrets (old secret is now second)
    const oldService = new TokenService({ secrets: [TEST_SECRET_2] });
    const newService = new TokenService({ secrets: [TEST_SECRET_1, TEST_SECRET_2] });

    fc.assert(
      fc.property(accessTokenPayloadArb, (payload) => {
        // Token signed with old secret
        const token = oldService.generateAccessToken(payload);

        // New service should still verify it (rotation support)
        const verified = newService.verifyAccessToken(token);
        expect(verified.userId).toBe(payload.userId);
      }),
      { numRuns: 50 },
    );
  });
});

// ─── Property 5: Formato de tokens criptográficos ────────────────────────────

describe('Property 5: Formato de tokens criptográficos', () => {
  /**
   * **Validates: Requirements 5.2, 6.2**
   *
   * For any token generado por el sistema, los refresh tokens SHALL ser exactamente
   * 128 caracteres hexadecimales (64 bytes) y los tokens de verificación SHALL ser
   * exactamente 64 caracteres hexadecimales (32 bytes), y todos los tokens generados
   * en una secuencia SHALL ser únicos entre sí.
   */

  const tokenService = new TokenService({ secrets: [TEST_SECRET_1] });

  it('should generate refresh tokens of exactly 128 hex characters', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1 }), () => {
        const token = tokenService.generateRefreshToken();

        // Exactly 128 hex characters (64 bytes)
        expect(token.length).toBe(128);
        // Only hex characters
        expect(token).toMatch(/^[0-9a-f]{128}$/);
      }),
      { numRuns: 100 },
    );
  });

  it('should generate verification tokens of exactly 64 hex characters', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1 }), () => {
        const token = tokenService.generateVerificationToken();

        // Exactly 64 hex characters (32 bytes)
        expect(token.length).toBe(64);
        // Only hex characters
        expect(token).toMatch(/^[0-9a-f]{64}$/);
      }),
      { numRuns: 100 },
    );
  });

  it('should generate unique refresh tokens across multiple invocations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        (count) => {
          const tokens = new Set<string>();
          for (let i = 0; i < count; i++) {
            tokens.add(tokenService.generateRefreshToken());
          }
          // All tokens should be unique
          expect(tokens.size).toBe(count);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should generate unique verification tokens across multiple invocations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        (count) => {
          const tokens = new Set<string>();
          for (let i = 0; i < count; i++) {
            tokens.add(tokenService.generateVerificationToken());
          }
          // All tokens should be unique
          expect(tokens.size).toBe(count);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should generate tokens that are different between refresh and verification types', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1 }), () => {
        const refreshToken = tokenService.generateRefreshToken();
        const verificationToken = tokenService.generateVerificationToken();

        // Different lengths
        expect(refreshToken.length).not.toBe(verificationToken.length);
        // Different values (extremely unlikely to collide)
        expect(refreshToken).not.toBe(verificationToken);
      }),
      { numRuns: 50 },
    );
  });
});
