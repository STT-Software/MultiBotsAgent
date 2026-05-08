import { describe, it, expect } from 'vitest';
import {
  CompanySize,
  ReferralSource,
  ServiceCategory,
  ValidationError,
} from '@multibotagents/types';
import type { RegisterDto } from '@multibotagents/types';
import { validateRegister, sanitizeText } from '../register.validator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return {
    companyName: 'Mi Empresa',
    email: 'user@example.com',
    password: 'Password1',
    country: 'CO',
    category: ServiceCategory.SALES,
    size: CompanySize.TWO_TO_FIVE,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('validateRegister', () => {
  describe('happy path', () => {
    it('should return validated data for valid input', () => {
      const result = validateRegister(validDto());

      expect(result.companyName).toBe('Mi Empresa');
      expect(result.email).toBe('user@example.com');
      expect(result.password).toBe('Password1');
      expect(result.country).toBe('CO');
      expect(result.category).toBe(ServiceCategory.SALES);
      expect(result.size).toBe(CompanySize.TWO_TO_FIVE);
    });

    it('should normalize email to lowercase', () => {
      const result = validateRegister(validDto({ email: 'User@EXAMPLE.COM' }));
      expect(result.email).toBe('user@example.com');
    });

    it('should normalize country to uppercase', () => {
      const result = validateRegister(validDto({ country: 'co' }));
      expect(result.country).toBe('CO');
    });

    it('should trim whitespace from email', () => {
      const result = validateRegister(validDto({ email: '  user@example.com  ' }));
      expect(result.email).toBe('user@example.com');
    });

    it('should include optional fields when provided', () => {
      const result = validateRegister(validDto({
        phone: '+57 300 123 4567',
        phoneCountryCode: '+57',
        referralSource: ReferralSource.GOOGLE,
        captchaToken: 'token123',
      }));

      expect(result.phone).toBe('+57 300 123 4567');
      expect(result.phoneCountryCode).toBe('+57');
      expect(result.referralSource).toBe(ReferralSource.GOOGLE);
      expect(result.captchaToken).toBe('token123');
    });

    it('should omit optional fields when not provided', () => {
      const result = validateRegister(validDto());
      expect(result.phone).toBeUndefined();
      expect(result.phoneCountryCode).toBeUndefined();
      expect(result.referralSource).toBeUndefined();
      expect(result.captchaToken).toBeUndefined();
    });
  });

  describe('companyName validation', () => {
    it('should reject empty companyName', () => {
      expect(() => validateRegister(validDto({ companyName: '' }))).toThrow(ValidationError);
    });

    it('should reject whitespace-only companyName', () => {
      expect(() => validateRegister(validDto({ companyName: '   ' }))).toThrow(ValidationError);
    });

    it('should reject companyName exceeding 100 characters', () => {
      const longName = 'A'.repeat(101);
      expect(() => validateRegister(validDto({ companyName: longName }))).toThrow(ValidationError);
    });

    it('should accept companyName of exactly 100 characters', () => {
      const name = 'A'.repeat(100);
      const result = validateRegister(validDto({ companyName: name }));
      expect(result.companyName).toBe(name);
    });
  });

  describe('email validation', () => {
    it('should reject empty email', () => {
      expect(() => validateRegister(validDto({ email: '' }))).toThrow(ValidationError);
    });

    it('should reject email without @', () => {
      expect(() => validateRegister(validDto({ email: 'invalid' }))).toThrow(ValidationError);
    });

    it('should reject email without domain', () => {
      expect(() => validateRegister(validDto({ email: 'user@' }))).toThrow(ValidationError);
    });

    it('should reject email with spaces', () => {
      expect(() => validateRegister(validDto({ email: 'user @example.com' }))).toThrow(ValidationError);
    });

    it('should accept valid email formats', () => {
      const result = validateRegister(validDto({ email: 'test.user+tag@sub.domain.com' }));
      expect(result.email).toBe('test.user+tag@sub.domain.com');
    });
  });

  describe('password validation', () => {
    it('should reject empty password', () => {
      expect(() => validateRegister(validDto({ password: '' }))).toThrow(ValidationError);
    });

    it('should reject password shorter than 8 characters', () => {
      expect(() => validateRegister(validDto({ password: 'Pass1' }))).toThrow(ValidationError);
    });

    it('should reject password without uppercase', () => {
      expect(() => validateRegister(validDto({ password: 'password1' }))).toThrow(ValidationError);
    });

    it('should reject password without number', () => {
      expect(() => validateRegister(validDto({ password: 'Password' }))).toThrow(ValidationError);
    });

    it('should accept valid password', () => {
      const result = validateRegister(validDto({ password: 'MyPass99' }));
      expect(result.password).toBe('MyPass99');
    });
  });

  describe('country validation', () => {
    it('should reject empty country', () => {
      expect(() => validateRegister(validDto({ country: '' }))).toThrow(ValidationError);
    });

    it('should reject invalid country code', () => {
      expect(() => validateRegister(validDto({ country: 'XX' }))).toThrow(ValidationError);
    });

    it('should accept valid country codes', () => {
      const result = validateRegister(validDto({ country: 'US' }));
      expect(result.country).toBe('US');
    });

    it('should accept lowercase country codes (normalized to uppercase)', () => {
      const result = validateRegister(validDto({ country: 'mx' }));
      expect(result.country).toBe('MX');
    });
  });

  describe('category validation', () => {
    it('should reject invalid category', () => {
      expect(() => validateRegister(validDto({ category: 'invalid' as ServiceCategory }))).toThrow(ValidationError);
    });

    it('should accept all valid categories', () => {
      for (const cat of Object.values(ServiceCategory)) {
        const result = validateRegister(validDto({ category: cat }));
        expect(result.category).toBe(cat);
      }
    });
  });

  describe('size validation', () => {
    it('should reject invalid size', () => {
      expect(() => validateRegister(validDto({ size: '100+' as CompanySize }))).toThrow(ValidationError);
    });

    it('should accept all valid sizes', () => {
      for (const size of Object.values(CompanySize)) {
        const result = validateRegister(validDto({ size }));
        expect(result.size).toBe(size);
      }
    });
  });

  describe('phone validation (optional)', () => {
    it('should accept valid phone numbers', () => {
      const result = validateRegister(validDto({ phone: '+1 555-123-4567' }));
      expect(result.phone).toBe('+1 555-123-4567');
    });

    it('should reject phone with invalid characters', () => {
      expect(() => validateRegister(validDto({ phone: 'abc123' }))).toThrow(ValidationError);
    });

    it('should skip validation when phone is empty string', () => {
      const result = validateRegister(validDto({ phone: '' }));
      expect(result.phone).toBeUndefined();
    });

    it('should skip validation when phone is undefined', () => {
      const result = validateRegister(validDto({ phone: undefined }));
      expect(result.phone).toBeUndefined();
    });
  });

  describe('referralSource validation (optional)', () => {
    it('should reject invalid referral source', () => {
      expect(() => validateRegister(validDto({ referralSource: 'tiktok' as ReferralSource }))).toThrow(ValidationError);
    });

    it('should accept all valid referral sources', () => {
      for (const source of Object.values(ReferralSource)) {
        const result = validateRegister(validDto({ referralSource: source }));
        expect(result.referralSource).toBe(source);
      }
    });
  });

  describe('multiple errors', () => {
    it('should report all invalid fields at once', () => {
      try {
        validateRegister({
          companyName: '',
          email: 'invalid',
          password: 'short',
          country: 'XX',
          category: 'bad' as ServiceCategory,
          size: 'bad' as CompanySize,
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationErr = err as ValidationError;
        expect(validationErr.fields).toHaveProperty('companyName');
        expect(validationErr.fields).toHaveProperty('email');
        expect(validationErr.fields).toHaveProperty('password');
        expect(validationErr.fields).toHaveProperty('country');
        expect(validationErr.fields).toHaveProperty('category');
        expect(validationErr.fields).toHaveProperty('size');
      }
    });
  });

  describe('sanitization', () => {
    it('should strip HTML tags from companyName', () => {
      const result = validateRegister(validDto({ companyName: '<script>alert("xss")</script>Mi Empresa' }));
      expect(result.companyName).toBe('alert("xss")Mi Empresa');
    });

    it('should strip control characters from companyName', () => {
      const result = validateRegister(validDto({ companyName: 'Mi\x00Empresa\x1F' }));
      expect(result.companyName).toBe('MiEmpresa');
    });

    it('should trim whitespace from companyName', () => {
      const result = validateRegister(validDto({ companyName: '  Mi Empresa  ' }));
      expect(result.companyName).toBe('Mi Empresa');
    });

    it('should reject companyName that becomes empty after sanitization', () => {
      expect(() => validateRegister(validDto({ companyName: '<script></script>' }))).toThrow(ValidationError);
    });
  });
});

describe('sanitizeText', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeText('<b>bold</b>')).toBe('bold');
  });

  it('should remove control characters', () => {
    expect(sanitizeText('hello\x00world\x1F')).toBe('helloworld');
  });

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('should handle combined sanitization', () => {
    expect(sanitizeText('  <div>hello\x00</div>  ')).toBe('hello');
  });
});
