/**
 * Unit tests for company-profile.service.ts
 *
 * Tests the CompanyProfileService business logic with mocked repositories and storage.
 */
import { describe, it, expect, vi } from 'vitest';
import { CompanySize, ReferralSource, ServiceCategory } from '@multibotagents/types';
import type { Company } from '@multibotagents/types';
import {
  CompanyProfileService,
  type ICompanyProfileRepository,
  type IUserProfileRepository,
} from '../company-profile.service';
import type { IStorageService } from '../interfaces';
import { CompanyNotFoundError, InvalidProfileDataError, InvalidContentTypeError } from '../errors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'company-123',
    name: 'Test Company',
    country: 'US',
    category: ServiceCategory.SALES,
    size: CompanySize.TWO_TO_FIVE,
    phone: '+1 555-0000',
    logo: 'https://cdn.example.com/logos/company-123/logo.png',
    referralSource: ReferralSource.GOOGLE,
    status: 'active' as any,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMocks() {
  const companyRepository: ICompanyProfileRepository = {
    findById: vi.fn(),
    updateProfile: vi.fn(),
  };

  const userRepository: IUserProfileRepository = {
    findAll: vi.fn(),
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

  return { service, companyRepository, userRepository, storageService };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CompanyProfileService', () => {
  describe('getProfile', () => {
    it('should return company data with email', async () => {
      const { service, companyRepository, userRepository } = createMocks();
      const mockCompany = createMockCompany();

      vi.mocked(companyRepository.findById).mockResolvedValue(mockCompany);
      vi.mocked(userRepository.findAll).mockResolvedValue([{ email: 'user@test.com' }]);

      const result = await service.getProfile('company-123');

      expect(result.id).toBe('company-123');
      expect(result.name).toBe('Test Company');
      expect(result.country).toBe('US');
      expect(result.category).toBe(ServiceCategory.SALES);
      expect(result.size).toBe(CompanySize.TWO_TO_FIVE);
      expect(result.phone).toBe('+1 555-0000');
      expect(result.logo).toBe('https://cdn.example.com/logos/company-123/logo.png');
      expect(result.referralSource).toBe(ReferralSource.GOOGLE);
      expect(result.email).toBe('user@test.com');
    });

    it('should throw CompanyNotFoundError when company does not exist', async () => {
      const { service, companyRepository } = createMocks();
      vi.mocked(companyRepository.findById).mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(CompanyNotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update and return company with valid data', async () => {
      const { service, companyRepository } = createMocks();
      const updatedCompany = createMockCompany({ name: 'Updated Name' });

      vi.mocked(companyRepository.updateProfile).mockResolvedValue(updatedCompany);

      const result = await service.updateProfile('company-123', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(companyRepository.updateProfile).toHaveBeenCalledWith(
        'company-123',
        expect.objectContaining({ name: 'Updated Name' }),
      );
    });

    it('should throw InvalidProfileDataError with invalid data', async () => {
      const { service } = createMocks();

      await expect(service.updateProfile('company-123', { name: '' })).rejects.toThrow(
        InvalidProfileDataError,
      );
    });

    it('should throw CompanyNotFoundError when company does not exist', async () => {
      const { service, companyRepository } = createMocks();
      vi.mocked(companyRepository.updateProfile).mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent', { name: 'Valid Name' }),
      ).rejects.toThrow(CompanyNotFoundError);
    });
  });

  describe('generateLogoUploadUrl', () => {
    it('should return upload and logo URLs with valid contentType', async () => {
      const { service, companyRepository, storageService } = createMocks();
      const mockCompany = createMockCompany();

      vi.mocked(companyRepository.findById).mockResolvedValue(mockCompany);
      vi.mocked(storageService.generatePresignedUploadUrl).mockResolvedValue(
        'https://s3.amazonaws.com/bucket/presigned-url',
      );
      vi.mocked(storageService.getPublicUrl).mockReturnValue(
        'https://cdn.example.com/logos/company-123/12345-logo.png',
      );

      const result = await service.generateLogoUploadUrl('company-123', 'image/png', 'logo.png');

      expect(result.uploadUrl).toBe('https://s3.amazonaws.com/bucket/presigned-url');
      expect(result.logoUrl).toBe('https://cdn.example.com/logos/company-123/12345-logo.png');
      expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith(
        expect.stringContaining('logos/company-123/'),
        'image/png',
        300,
      );
    });

    it('should throw InvalidContentTypeError with invalid contentType', async () => {
      const { service } = createMocks();

      await expect(
        service.generateLogoUploadUrl('company-123', 'image/svg+xml', 'logo.svg'),
      ).rejects.toThrow(InvalidContentTypeError);
    });

    it('should throw CompanyNotFoundError when company does not exist', async () => {
      const { service, companyRepository } = createMocks();
      vi.mocked(companyRepository.findById).mockResolvedValue(null);

      await expect(
        service.generateLogoUploadUrl('nonexistent', 'image/png', 'logo.png'),
      ).rejects.toThrow(CompanyNotFoundError);
    });
  });

  describe('deleteLogo', () => {
    it('should delete from S3 and update DB when logo exists', async () => {
      const { service, companyRepository, storageService } = createMocks();
      const mockCompany = createMockCompany({
        logo: 'https://cdn.example.com/logos/company-123/12345-logo.png',
      });

      vi.mocked(companyRepository.findById).mockResolvedValue(mockCompany);
      vi.mocked(storageService.deleteObject).mockResolvedValue(undefined);
      vi.mocked(companyRepository.updateProfile).mockResolvedValue(
        createMockCompany({ logo: undefined }),
      );

      await service.deleteLogo('company-123');

      expect(storageService.deleteObject).toHaveBeenCalledWith(
        'logos/company-123/12345-logo.png',
      );
      expect(companyRepository.updateProfile).toHaveBeenCalledWith('company-123', { logo: null });
    });

    it('should not fail when no logo exists', async () => {
      const { service, companyRepository, storageService } = createMocks();
      const mockCompany = createMockCompany({ logo: undefined });

      vi.mocked(companyRepository.findById).mockResolvedValue(mockCompany);
      vi.mocked(companyRepository.updateProfile).mockResolvedValue(
        createMockCompany({ logo: undefined }),
      );

      await expect(service.deleteLogo('company-123')).resolves.not.toThrow();
      expect(storageService.deleteObject).not.toHaveBeenCalled();
      expect(companyRepository.updateProfile).toHaveBeenCalledWith('company-123', { logo: null });
    });

    it('should throw CompanyNotFoundError when company does not exist', async () => {
      const { service, companyRepository } = createMocks();
      vi.mocked(companyRepository.findById).mockResolvedValue(null);

      await expect(service.deleteLogo('nonexistent')).rejects.toThrow(CompanyNotFoundError);
    });
  });
});
