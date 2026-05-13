/**
 * Módulo de gestión del perfil de empresa.
 * Exporta interfaces, servicios, validadores y errores del dominio.
 */

// Interfaces
export type { IStorageService } from './interfaces';

// Service
export { CompanyProfileService } from './company-profile.service';
export type {
  CompanyProfileServiceDeps,
  CompanyProfileResult,
  UploadUrlResult,
  ICompanyProfileRepository,
  IUserProfileRepository,
} from './company-profile.service';

// Validator
export {
  validateProfileUpdate,
  validateLogoContentType,
} from './company-profile.validator';
export type { ValidatedProfileData } from './company-profile.validator';

// Errors
export {
  CompanyProfileErrorCode,
  CompanyProfileError,
  CompanyNotFoundError,
  InvalidProfileDataError,
  LogoUploadError,
  InvalidContentTypeError,
} from './errors';
