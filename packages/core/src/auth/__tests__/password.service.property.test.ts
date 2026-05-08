/**
 * Property-Based Tests para PasswordService.
 *
 * Property 3: Hashing seguro de contraseña (round-trip)
 *
 * Feature: flujo-2.1-registro-empresa-usuario
 */
import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { PasswordService } from '../password.service';

// ─── Property 3: Hashing seguro de contraseña (round-trip) ───────────────────

describe('Property 3: Hashing seguro de contraseña (round-trip)', () => {
  /**
   * **Validates: Requirements 4.4, 10.1**
   *
   * For any contraseña válida proporcionada en el registro, el hash almacenado
   * SHALL ser un hash bcrypt con cost factor 12 (prefijo `$2a$12` o `$2b$12`),
   * y `bcrypt.compare(contraseña_original, hash_almacenado)` SHALL retornar true.
   */

  const passwordService = new PasswordService();

  /** Genera contraseñas válidas (mín 8 chars, 1 mayúscula, 1 número). */
  const validPasswordArb = fc
    .tuple(
      fc.stringMatching(/^[a-z]{5,50}$/),
      fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
      fc.constantFrom(...'0123456789'.split('')),
    )
    .map(([base, upper, digit]) => `${base}${upper}${digit}`);

  it('should produce a bcrypt hash with cost factor 12 for any valid password', async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await passwordService.hash(password);

        // Hash should start with bcrypt cost factor 12 prefix
        const hasValidPrefix = hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$');
        expect(hasValidPrefix).toBe(true);

        // Hash should be a valid bcrypt hash (60 characters)
        expect(hash.length).toBe(60);
      }),
      { numRuns: 5 }, // Reduced runs because bcrypt cost 12 is slow (~250ms per hash)
    );
  }, 30000);

  it('should verify correctly: compare(original, hash) returns true', async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await passwordService.hash(password);
        const isValid = await passwordService.verify(password, hash);
        expect(isValid).toBe(true);
      }),
      { numRuns: 5 }, // Reduced runs because bcrypt cost 12 is slow
    );
  }, 30000);

  it('should reject wrong passwords: compare(different, hash) returns false', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        validPasswordArb.filter(p => p.length > 0),
        async (password, differentPassword) => {
          // Ensure they are actually different
          if (password === differentPassword) return;

          const hash = await passwordService.hash(password);
          const isValid = await passwordService.verify(differentPassword, hash);
          expect(isValid).toBe(false);
        },
      ),
      { numRuns: 3 }, // Reduced runs because bcrypt cost 12 is slow
    );
  }, 30000);

  it('should never store the plain password in the hash', async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await passwordService.hash(password);
        // The hash should not contain the plain password
        expect(hash).not.toContain(password);
      }),
      { numRuns: 5 }, // Reduced runs because bcrypt cost 12 is slow
    );
  }, 30000);
});
