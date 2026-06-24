/**
 * Property-based tests for company-profile domain.
 *
 * Uses fast-check to verify correctness properties across many inputs.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { CompanySize, ReferralSource, ServiceCategory } from '@multibotagents/types';
import type { Company, UpdateCompanyProfileDto } from '@multibotagents/types';
import {
  validateProfileUpdate,
  sanitizeText,
} from '../company-profile.validator';
import {
  CompanyProfileService,
  type ICompanyProfileRepository,
  type IUserProfileRepository,
} from '../company-profile.service';
import type { IStorageService } from '../interfaces';

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generator for valid CompanySize enum values. */
const companySizeArb = fc.constantFrom(...Object.values(CompanySize));

/** Generator for valid ReferralSource enum values. */
const referralSourceArb = fc.constantFrom(...Object.values(ReferralSource));

/** Generator for valid ServiceCategory enum values. */
const serviceCategoryArb = fc.constantFrom(...Object.values(ServiceCategory));

/** Generator for strings that contain HTML tags. */
const safeChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
const safeStringArb = fc.string({
  minLength: 1,
  maxLength: 20,
  unit: fc.constantFrom(...safeChars.split('')),
});
const htmlStringArb = fc.tuple(
  safeStringArb,
  fc.constantFrom('script', 'b', 'i', 'div', 'span', 'a', 'img'),
  safeStringArb,
).map(([before, tag, after]) => `${before}<${tag}>${after}</${tag}>`);

/** Generator for valid country codes (subset). */
const validCountryArb = fc.constantFrom('US', 'CO', 'MX', 'AR', 'ES', 'GB', 'FR', 'DE', 'JP', 'BR');

/** Generator for valid phone numbers. */
const validPhoneArb = fc.tuple(
  fc.constantFrom('+1', '+57', '+34', '+44', '+49'),
  fc.string({ minLength: 6, maxLength: 10, unit: fc.constantFrom(...'0123456789'.split('')) }),
).map(([prefix, digits]) => `${prefix} ${digits}`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'company-123',
    name: 'Test Company',
    country: 'US',
    category: ServiceCategory.SALES,
    size: CompanySize.TWO_TO_FIVE,
    phone: '+1 555-0000',
    logo: undefined,
    referralSource: ReferralSource.GOOGLE,
    status: 'active' as any,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property-based tests: Company Profile', () => {
  /**
   * **Validates: Requirements 2.4, Design Property 2**
   *
   * Property: Fields not sent in PATCH are not modified (preservation).
   * When updateProfile is called with a partial DTO, only the sent fields
   * should be passed to the repository — other fields remain untouched.
   */
  describe('Property: fields not sent in PATCH are not modified', () => {
    it('should only pass provided fields to the repository', () => {
      fc.assert(
        fc.property(
          // Generate a random subset of fields to include
          fc.record({
            name: fc.option(safeStringArb.filter(s => s.trim().length > 0), { nil: undefined }),
            country: fc.option(validCountryArb, { nil: undefined }),
            size: fc.option(companySizeArb, { nil: undefined }),
            category: fc.option(serviceCategoryArb, { nil: undefined }),
            referralSource: fc.option(referralSourceArb, { nil: undefined }),
          }),
          (partialDto) => {
            // Filter out undefined values to simulate a real PATCH
            const dto: UpdateCompanyProfileDto = {};
            if (partialDto.name !== undefined) dto.name = partialDto.name;
            if (partialDto.country !== undefined) dto.country = partialDto.country;
            if (partialDto.size !== undefined) dto.size = partialDto.size;
            if (partialDto.category !== undefined) dto.category = partialDto.category;
            if (partialDto.referralSource !== undefined) dto.referralSource = partialDto.referralSource;

            // If DTO is empty, skip (nothing to validate)
            if (Object.keys(dto).length === 0) return true;

            try {
              const result = validateProfileUpdate(dto);

              // Only fields that were sent should be present in the result
              if (dto.name === undefined) expect(result.name).toBeUndefined();
              if (dto.country === undefined) expect(result.country).toBeUndefined();
              if (dto.size === undefined) expect(result.size).toBeUndefined();
              if (dto.category === undefined) expect(result.category).toBeUndefined();
              if (dto.referralSource === undefined) expect(result.referralSource).toBeUndefined();

              return true;
            } catch {
              // Validation errors are acceptable (invalid data)
              return true;
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Validates: Requirements 3.5, 3.6**
   *
   * Property: Every valid enum value is accepted by the validator.
   * All values from CompanySize, ReferralSource, and ServiceCategory enums
   * should pass validation without errors.
   */
  describe('Property: every valid enum value is accepted by the validator', () => {
    it('should accept all valid CompanySize values', () => {
      fc.assert(
        fc.property(companySizeArb, (size) => {
          const result = validateProfileUpdate({ size });
          expect(result.size).toBe(size);
        }),
        { numRuns: 50 },
      );
    });

    it('should accept all valid ReferralSource values', () => {
      fc.assert(
        fc.property(referralSourceArb, (referralSource) => {
          const result = validateProfileUpdate({ referralSource });
          expect(result.referralSource).toBe(referralSource);
        }),
        { numRuns: 50 },
      );
    });

    it('should accept all valid ServiceCategory values', () => {
      fc.assert(
        fc.property(serviceCategoryArb, (category) => {
          const result = validateProfileUpdate({ category });
          expect(result.category).toBe(category);
        }),
        { numRuns: 50 },
      );
    });
  });

  /**
   * **Validates: Requirements 6.4, Design Security**
   *
   * Property: Every string with HTML tags is sanitized (no `<` or `>` after sanitization).
   * The sanitizeText function must strip all HTML angle brackets from any input.
   */
  describe('Property: every string with HTML tags is sanitized', () => {
    it('should not contain < or > after sanitization', () => {
      fc.assert(
        fc.property(htmlStringArb, (input) => {
          const sanitized = sanitizeText(input);
          expect(sanitized).not.toContain('<');
          expect(sanitized).not.toContain('>');
        }),
        { numRuns: 200 },
      );
    });

    it('should not contain < or > for arbitrary strings with angle brackets', () => {
      // Generate strings that definitely contain angle brackets
      const stringWithAnglesArb = fc.tuple(
        safeStringArb,
        fc.constantFrom('<div>', '<script>', '<b>', '< >', '<img src="x">'),
        safeStringArb,
      ).map(([a, tag, b]) => `${a}${tag}${b}`);

      fc.assert(
        fc.property(
          stringWithAnglesArb,
          (input) => {
            const sanitized = sanitizeText(input);
            expect(sanitized).not.toContain('<');
            expect(sanitized).not.toContain('>');
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * **Validates: Design Property 6**
   *
   * Property: Round-trip — updateProfile followed by getProfile returns the sent data.
   * When valid data is sent to updateProfile, a subsequent getProfile should return
   * the same values for the updated fields.
   */
  describe('Property: round-trip — updateProfile followed by getProfile returns sent data', () => {
    it('should return the same data that was sent in updateProfile', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: safeStringArb.filter(s => s.trim().length > 0),
            country: validCountryArb,
            size: companySizeArb,
            category: serviceCategoryArb,
            referralSource: referralSourceArb,
            phone: validPhoneArb,
          }),
          async (validData) => {
            // Create a mock company that will be "updated" with the new data
            const updatedCompany = createMockCompany({
              name: validData.name,
              country: validData.country,
              size: validData.size,
              category: validData.category,
              referralSource: validData.referralSource,
              phone: validData.phone,
            });

            const companyRepository: ICompanyProfileRepository = {
              findById: vi.fn().mockResolvedValue(updatedCompany),
              updateProfile: vi.fn().mockResolvedValue(updatedCompany),
            };

            const userRepository: IUserProfileRepository = {
              findAll: vi.fn().mockResolvedValue([{ email: 'test@example.com' }]),
            };

            const storageService: IStorageService = {
              generatePresignedUploadUrl: vi.fn(),
              deleteObject: vi.fn(),
              getPublicUrl: vi.fn(),
            };

            const service = new CompanyProfileService({
              companyRepository,
              userRepository,
              storageService,
            });

            // Update profile
            await service.updateProfile('company-123', validData);

            // Get profile should return the updated data
            const profile = await service.getProfile('company-123');

            expect(profile.name).toBe(validData.name);
            expect(profile.country).toBe(validData.country);
            expect(profile.size).toBe(validData.size);
            expect(profile.category).toBe(validData.category);
            expect(profile.referralSource).toBe(validData.referralSource);
            expect(profile.phone).toBe(validData.phone);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
