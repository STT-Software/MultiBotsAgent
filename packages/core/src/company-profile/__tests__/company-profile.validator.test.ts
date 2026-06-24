/**
 * Unit tests for company-profile.validator.ts
 *
 * Tests validation and sanitization logic for company profile updates.
 */
import { describe, it, expect } from 'vitest';
import { CompanySize, ReferralSource, ServiceCategory } from '@multibotagents/types';
import {
  validateProfileUpdate,
  validateLogoContentType,
  sanitizeText,
} from '../company-profile.validator';
import { InvalidProfileDataError, InvalidContentTypeError } from '../errors';

describe('validateProfileUpdate', () => {
  // ── name validation ──

  it('should throw error when name is empty string', () => {
    expect(() => validateProfileUpdate({ name: '' })).toThrow(InvalidProfileDataError);
    try {
      validateProfileUpdate({ name: '' });
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidProfileDataError);
      expect((e as InvalidProfileDataError).fields.name).toBeDefined();
    }
  });

  it('should throw error when name is only whitespace', () => {
    expect(() => validateProfileUpdate({ name: '   ' })).toThrow(InvalidProfileDataError);
  });

  it('should sanitize name with HTML tags correctly', () => {
    const result = validateProfileUpdate({ name: '<script>alert("xss")</script>My Company' });
    expect(result.name).toBe('alert("xss")My Company');
    expect(result.name).not.toContain('<');
    expect(result.name).not.toContain('>');
  });

  it('should sanitize name with nested HTML tags', () => {
    const result = validateProfileUpdate({ name: '<b>Bold</b> <i>Italic</i> Company' });
    expect(result.name).toBe('Bold Italic Company');
  });

  // ── country validation ──

  it('should throw error when country is invalid code', () => {
    expect(() => validateProfileUpdate({ country: 'XX' })).toThrow(InvalidProfileDataError);
    try {
      validateProfileUpdate({ country: 'XX' });
    } catch (e) {
      expect((e as InvalidProfileDataError).fields.country).toBeDefined();
    }
  });

  it('should throw error when country is empty', () => {
    expect(() => validateProfileUpdate({ country: '' })).toThrow(InvalidProfileDataError);
  });

  it('should accept valid country code', () => {
    const result = validateProfileUpdate({ country: 'US' });
    expect(result.country).toBe('US');
  });

  it('should normalize country code to uppercase', () => {
    const result = validateProfileUpdate({ country: 'co' });
    expect(result.country).toBe('CO');
  });

  // ── size validation ──

  it('should throw error when size has invalid value', () => {
    expect(() => validateProfileUpdate({ size: 'invalid' as CompanySize })).toThrow(
      InvalidProfileDataError,
    );
    try {
      validateProfileUpdate({ size: 'invalid' as CompanySize });
    } catch (e) {
      expect((e as InvalidProfileDataError).fields.size).toBeDefined();
    }
  });

  it('should accept valid size value', () => {
    const result = validateProfileUpdate({ size: CompanySize.TWO_TO_FIVE });
    expect(result.size).toBe(CompanySize.TWO_TO_FIVE);
  });

  // ── referralSource validation ──

  it('should throw error when referralSource has invalid value', () => {
    expect(() =>
      validateProfileUpdate({ referralSource: 'invalid' as ReferralSource }),
    ).toThrow(InvalidProfileDataError);
    try {
      validateProfileUpdate({ referralSource: 'invalid' as ReferralSource });
    } catch (e) {
      expect((e as InvalidProfileDataError).fields.referralSource).toBeDefined();
    }
  });

  it('should accept valid referralSource value', () => {
    const result = validateProfileUpdate({ referralSource: ReferralSource.GOOGLE });
    expect(result.referralSource).toBe(ReferralSource.GOOGLE);
  });

  it('should accept null referralSource', () => {
    const result = validateProfileUpdate({ referralSource: null });
    expect(result.referralSource).toBeNull();
  });

  // ── complete valid data ──

  it('should pass validation with complete valid data', () => {
    const validData = {
      name: 'Acme Corp',
      country: 'US',
      category: ServiceCategory.SALES,
      size: CompanySize.SIX_TO_TEN,
      phone: '+1 555-1234',
      referralSource: ReferralSource.YOUTUBE,
    };

    const result = validateProfileUpdate(validData);

    expect(result.name).toBe('Acme Corp');
    expect(result.country).toBe('US');
    expect(result.category).toBe(ServiceCategory.SALES);
    expect(result.size).toBe(CompanySize.SIX_TO_TEN);
    expect(result.phone).toBe('+1 555-1234');
    expect(result.referralSource).toBe(ReferralSource.YOUTUBE);
  });

  it('should pass validation with partial data (PATCH)', () => {
    const result = validateProfileUpdate({ name: 'New Name' });
    expect(result.name).toBe('New Name');
    expect(result.country).toBeUndefined();
    expect(result.size).toBeUndefined();
  });
});

describe('validateLogoContentType', () => {
  it('should throw error for SVG content type', () => {
    expect(() => validateLogoContentType('image/svg+xml')).toThrow(InvalidContentTypeError);
  });

  it('should throw error for unsupported content types', () => {
    expect(() => validateLogoContentType('application/pdf')).toThrow(InvalidContentTypeError);
    expect(() => validateLogoContentType('image/gif')).toThrow(InvalidContentTypeError);
    expect(() => validateLogoContentType('text/html')).toThrow(InvalidContentTypeError);
  });

  it('should accept image/png', () => {
    expect(() => validateLogoContentType('image/png')).not.toThrow();
  });

  it('should accept image/jpeg', () => {
    expect(() => validateLogoContentType('image/jpeg')).not.toThrow();
  });
});

describe('sanitizeText', () => {
  it('should remove HTML tags from text', () => {
    expect(sanitizeText('<b>hello</b>')).toBe('hello');
  });

  it('should remove script tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>safe')).toBe('alert("xss")safe');
  });

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('should remove control characters', () => {
    expect(sanitizeText('hello\x00world')).toBe('helloworld');
  });
});
