/**
 * Property Test: Validación de formato de token rechaza entradas inválidas
 *
 * Feature: email-verification, Property 6: Validación de formato de token rechaza entradas inválidas
 *
 * Para cualquier string que NO sea una cadena hexadecimal de exactamente 64 caracteres,
 * el sistema rechaza la solicitud. Para cualquier string hex de 64 chars, retorna true.
 *
 * **Validates: Requirements 4.5**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TokenService } from '../token.service';

const tokenService = new TokenService();

describe('Feature: email-verification, Property 6: Validación de formato de token rechaza entradas inválidas', () => {
  it('should return false for any string that is NOT a 64-char hex string', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Empty strings
          fc.constant(''),
          // Arbitrary strings that are not valid hex of 64 chars
          fc.string({ minLength: 1, maxLength: 200 }).filter(
            (s) => !/^[0-9a-f]{64}$/.test(s)
          ),
          // Strings of wrong length (shorter than 64) using hex chars only
          fc.stringMatching(/^[0-9a-f]{1,63}$/),
          // Strings of wrong length (longer than 64) using hex chars only
          fc.stringMatching(/^[0-9a-f]{65,80}$/),
          // Strings of exactly 64 chars with uppercase hex (should be rejected)
          fc.stringMatching(/^[0-9A-F]{64}$/).filter((s) => /[A-F]/.test(s)),
          // Strings with spaces padded to 64 chars
          fc.tuple(
            fc.stringMatching(/^[0-9a-f]{1,30}$/),
            fc.stringMatching(/^[0-9a-f]{1,30}$/)
          ).map(([a, b]) => (a + ' ' + b).padEnd(64, ' ').slice(0, 64)),
          // Strings with special characters of length 64
          fc.tuple(
            fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'),
            fc.stringMatching(/^[0-9a-f]{63}$/)
          ).map(([special, rest]) => special + rest)
        ),
        (input) => {
          expect(tokenService.validateTokenFormat(input)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return true for any valid 64-char hex string', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9a-f]{64}$/),
        (validHexToken) => {
          expect(tokenService.validateTokenFormat(validHexToken)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
