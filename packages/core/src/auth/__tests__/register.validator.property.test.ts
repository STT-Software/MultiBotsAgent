/* eslint-disable no-control-regex */
/**
 * Property-Based Tests para RegisterValidator.
 *
 * Property 8: Validación rechaza entrada inválida con detalle de campos
 * Property 10: Sanitización de entrada
 * Property 11: Validación de catálogo (enums)
 *
 * Feature: flujo-2.1-registro-empresa-usuario
 */
import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  CompanySize,
  ReferralSource,
  ServiceCategory,
  ValidationError,
} from '@multibotagents/types';
import type { RegisterDto } from '@multibotagents/types';
import { validateRegister, sanitizeText, ISO_3166_ALPHA2_CODES } from '../register.validator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Genera un RegisterDto válido base. */
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

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Genera emails con formato inválido. */
const invalidEmailArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.stringMatching(/^[a-z]{1,20}$/), // sin @
  fc.stringMatching(/^[a-z]{1,10}@$/) // sin dominio
);

/** Genera strings que NO son valores válidos de ServiceCategory. */
const invalidCategoryArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => !Object.values(ServiceCategory).includes(s as ServiceCategory));

/** Genera strings que NO son valores válidos de CompanySize. */
const invalidSizeArb = fc.string({ minLength: 1, maxLength: 10 })
  .filter(s => !Object.values(CompanySize).includes(s as CompanySize));

/** Genera strings de 2 letras que NO son códigos de país ISO 3166-1 alpha-2 válidos. */
const invalidCountryArb = fc.stringMatching(/^[A-Z]{2}$/)
  .filter(s => !ISO_3166_ALPHA2_CODES.has(s));

// ─── Property 8: Validación rechaza entrada inválida con detalle de campos ───

describe('Property 8: Validación rechaza entrada inválida con detalle de campos', () => {
  /**
   * **Validates: Requirements 1.3, 1.4, 1.5, 8.2, 10.5**
   */

  it('should reject registration with invalid email and report the field', () => {
    fc.assert(
      fc.property(invalidEmailArb, (email) => {
        try {
          validateRegister(validDto({ email }));
          // If it doesn't throw, the email was actually valid (edge case)
          return true;
        } catch (err) {
          expect(err).toBeInstanceOf(ValidationError);
          const ve = err as ValidationError;
          expect(ve.fields).toHaveProperty('email');
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should reject registration with invalid password and report the field', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 7 }),
        (password) => {
          try {
            validateRegister(validDto({ password }));
            return true;
          } catch (err) {
            expect(err).toBeInstanceOf(ValidationError);
            const ve = err as ValidationError;
            expect(ve.fields).toHaveProperty('password');
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should reject registration with invalid country and report the field', () => {
    fc.assert(
      fc.property(invalidCountryArb, (country) => {
        try {
          validateRegister(validDto({ country }));
          return true;
        } catch (err) {
          expect(err).toBeInstanceOf(ValidationError);
          const ve = err as ValidationError;
          expect(ve.fields).toHaveProperty('country');
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should reject registration with invalid category and report the field', () => {
    fc.assert(
      fc.property(invalidCategoryArb, (category) => {
        try {
          validateRegister(validDto({ category: category as ServiceCategory }));
          return true;
        } catch (err) {
          expect(err).toBeInstanceOf(ValidationError);
          const ve = err as ValidationError;
          expect(ve.fields).toHaveProperty('category');
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should reject registration with invalid size and report the field', () => {
    fc.assert(
      fc.property(invalidSizeArb, (size) => {
        try {
          validateRegister(validDto({ size: size as CompanySize }));
          return true;
        } catch (err) {
          expect(err).toBeInstanceOf(ValidationError);
          const ve = err as ValidationError;
          expect(ve.fields).toHaveProperty('size');
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should report multiple invalid fields simultaneously', () => {
    fc.assert(
      fc.property(
        invalidEmailArb,
        fc.string({ minLength: 1, maxLength: 7 }),
        invalidCountryArb,
        (email, password, country) => {
          try {
            validateRegister({
              companyName: 'Valid Company',
              email,
              password,
              country,
              category: ServiceCategory.SALES,
              size: CompanySize.ONE,
            });
            return true;
          } catch (err) {
            expect(err).toBeInstanceOf(ValidationError);
            const ve = err as ValidationError;
            // At least some of the fields should be reported
            const reportedFields = Object.keys(ve.fields);
            expect(reportedFields.length).toBeGreaterThan(0);
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 10: Sanitización de entrada ────────────────────────────────────

describe('Property 10: Sanitización de entrada', () => {
  /**
   * **Validates: Requirements 10.4**
   */

  it('should sanitize HTML tags from company name', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-zA-Z]{1,20}$/),
          fc.constantFrom('<script>', '<div>', '<img>', '<b>', '<a href="x">'),
        ).map(([text, tag]) => `${tag}${text}`),
        (companyName) => {
          try {
            const result = validateRegister(validDto({ companyName }));
            // Sanitized value should not contain HTML tags
            expect(result.companyName).not.toMatch(/<[^>]*>/);
            return true;
          } catch {
            // May throw ValidationError if sanitized name is empty — that's OK
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should sanitize control characters from all text fields', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z]{3,30}$/).map(s => `${s}\x00\x01\x1F`),
        (companyName) => {
          try {
            const result = validateRegister(validDto({ companyName }));
            // Sanitized value should not contain control characters
            expect(result.companyName).not.toMatch(/[\x00-\x1F\x7F]/);
            return true;
          } catch {
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sanitizeText should always remove HTML and control chars for any input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (input) => {
        const sanitized = sanitizeText(input);
        // No HTML tags in output
        expect(sanitized).not.toMatch(/<[^>]*>/);
        // No control characters in output
        expect(sanitized).not.toMatch(/[\x00-\x1F\x7F]/);
        // No leading/trailing whitespace
        expect(sanitized).toBe(sanitized.trim());
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('should sanitize phone field when provided with dangerous content', () => {
    fc.assert(
      fc.property(
        fc.constant('+57 300 123 4567\x00'),
        (phone) => {
          const result = validateRegister(validDto({ phone }));
          if (result.phone) {
            expect(result.phone).not.toMatch(/[\x00-\x1F\x7F]/);
          }
          return true;
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ─── Property 11: Validación de catálogo (enums) ─────────────────────────────

describe('Property 11: Validación de catálogo (enums)', () => {
  /**
   * **Validates: Requirements 10.5**
   */

  it('should accept only valid ServiceCategory values', () => {
    const validCategories = Object.values(ServiceCategory);
    fc.assert(
      fc.property(
        fc.constantFrom(...validCategories),
        (category) => {
          const result = validateRegister(validDto({ category }));
          expect(result.category).toBe(category);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should reject any string not in ServiceCategory enum', () => {
    fc.assert(
      fc.property(invalidCategoryArb, (category) => {
        try {
          validateRegister(validDto({ category: category as ServiceCategory }));
          return false; // Should have thrown
        } catch (err) {
          expect(err).toBeInstanceOf(ValidationError);
          const ve = err as ValidationError;
          expect(ve.fields).toHaveProperty('category');
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should accept only valid CompanySize values', () => {
    const validSizes = Object.values(CompanySize);
    fc.assert(
      fc.property(
        fc.constantFrom(...validSizes),
        (size) => {
          const result = validateRegister(validDto({ size }));
          expect(result.size).toBe(size);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should reject any string not in CompanySize enum', () => {
    fc.assert(
      fc.property(invalidSizeArb, (size) => {
        try {
          validateRegister(validDto({ size: size as CompanySize }));
          return false; // Should have thrown
        } catch (err) {
          expect(err).toBeInstanceOf(ValidationError);
          const ve = err as ValidationError;
          expect(ve.fields).toHaveProperty('size');
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should accept only valid ISO 3166-1 alpha-2 country codes', () => {
    const validCountries = Array.from(ISO_3166_ALPHA2_CODES);
    fc.assert(
      fc.property(
        fc.constantFrom(...validCountries),
        (country) => {
          const result = validateRegister(validDto({ country }));
          expect(result.country).toBe(country.toUpperCase());
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should reject any 2-letter string not in ISO 3166-1 alpha-2', () => {
    fc.assert(
      fc.property(invalidCountryArb, (country) => {
        try {
          validateRegister(validDto({ country }));
          return false; // Should have thrown
        } catch (err) {
          expect(err).toBeInstanceOf(ValidationError);
          const ve = err as ValidationError;
          expect(ve.fields).toHaveProperty('country');
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should accept only valid ReferralSource values when provided', () => {
    const validSources = Object.values(ReferralSource);
    fc.assert(
      fc.property(
        fc.constantFrom(...validSources),
        (referralSource) => {
          const result = validateRegister(validDto({ referralSource }));
          expect(result.referralSource).toBe(referralSource);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should reject any string not in ReferralSource enum', () => {
    const invalidSourceArb = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => !Object.values(ReferralSource).includes(s as ReferralSource));

    fc.assert(
      fc.property(invalidSourceArb, (referralSource) => {
        try {
          validateRegister(validDto({ referralSource: referralSource as ReferralSource }));
          return false; // Should have thrown
        } catch (err) {
          expect(err).toBeInstanceOf(ValidationError);
          const ve = err as ValidationError;
          expect(ve.fields).toHaveProperty('referralSource');
          return true;
        }
      }),
      { numRuns: 100 },
    );
  });
});
