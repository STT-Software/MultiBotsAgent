/**
 * Unit Tests para TokenService de email-verification.
 *
 * Validates: Requirements 1.1, 1.4, 4.5
 */
import { describe, it, expect } from 'vitest';
import { TokenService } from '../token.service';

describe('TokenService', () => {
  const tokenService = new TokenService();

  describe('generateVerificationToken()', () => {
    it('should return a string of exactly 64 characters', () => {
      const token = tokenService.generateVerificationToken();
      expect(token.length).toBe(64);
    });

    it('should return only lowercase hex characters', () => {
      const token = tokenService.generateVerificationToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens on consecutive calls', () => {
      const token1 = tokenService.generateVerificationToken();
      const token2 = tokenService.generateVerificationToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateTokenFormat()', () => {
    it('should return true for a valid 64-char hex string', () => {
      const token = tokenService.generateVerificationToken();
      expect(tokenService.validateTokenFormat(token)).toBe(true);
    });

    it('should return true for a manually crafted valid hex string', () => {
      const valid = 'a'.repeat(64);
      expect(tokenService.validateTokenFormat(valid)).toBe(true);
    });

    it('should return false for an empty string', () => {
      expect(tokenService.validateTokenFormat('')).toBe(false);
    });

    it('should return false for a string shorter than 64 characters', () => {
      expect(tokenService.validateTokenFormat('abc123')).toBe(false);
    });

    it('should return false for a string longer than 64 characters', () => {
      expect(tokenService.validateTokenFormat('a'.repeat(65))).toBe(false);
    });

    it('should return false for uppercase hex characters', () => {
      expect(tokenService.validateTokenFormat('A'.repeat(64))).toBe(false);
    });

    it('should return false for non-hex characters', () => {
      const invalid = 'g'.repeat(64);
      expect(tokenService.validateTokenFormat(invalid)).toBe(false);
    });

    it('should return false for strings with spaces', () => {
      const withSpaces = ' '.repeat(32) + 'a'.repeat(32);
      expect(tokenService.validateTokenFormat(withSpaces)).toBe(false);
    });

    it('should return false for strings with special characters', () => {
      const withSpecial = '!@#$%^&*()_+'.padEnd(64, 'a');
      expect(tokenService.validateTokenFormat(withSpecial)).toBe(false);
    });
  });
});
