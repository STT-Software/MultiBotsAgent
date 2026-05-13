/**
 * Property-Based Test para TokenService — Propiedad 1: Invariante de formato de token.
 *
 * Feature: email-verification, Property 1: Invariante de formato de token
 *
 * Verifica que para CUALQUIER invocación de `generateVerificationToken()`,
 * el resultado es siempre una cadena hexadecimal de exactamente 64 caracteres
 * con charset [0-9a-f].
 *
 * **Validates: Requirements 1.1, 1.4**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TokenService } from '../token.service';

describe('TokenService — Property Tests', () => {
  const tokenService = new TokenService();

  it('Property 1: Invariante de formato de token — generateVerificationToken() siempre produce hex de 64 caracteres [0-9a-f]', () => {
    fc.assert(
      fc.property(
        // Usamos fc.constant(undefined) porque generateVerificationToken no recibe parámetros.
        // Cada iteración invoca el método y verifica la propiedad.
        fc.constant(undefined),
        () => {
          const token = tokenService.generateVerificationToken();

          // Debe ser un string
          expect(typeof token).toBe('string');

          // Debe tener exactamente 64 caracteres
          expect(token.length).toBe(64);

          // Cada carácter debe pertenecer al charset [0-9a-f]
          expect(token).toMatch(/^[0-9a-f]{64}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
