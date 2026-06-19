/**
 * Servicio de gestión del perfil de empresa.
 *
 * Responsabilidades:
 * - Obtener perfil de empresa con email del usuario asociado
 * - Actualizar datos del perfil (validación + sanitización + persistencia)
 * - Generar presigned URL para carga de logo
 * - Eliminar logo de S3 y actualizar BD
 *
 * Este módulo es lógica pura sin dependencias de AWS ni I/O directo.
 * Las dependencias se inyectan via constructor (patrón ports & adapters).
 */
import type { Company, UpdateCompanyProfileDto } from '@multibotagents/types';
import type { IStorageService } from './interfaces';
import { validateProfileUpdate, validateLogoContentType, sanitizeText } from './company-profile.validator';
import { CompanyNotFoundError, LogoUploadError } from './errors';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** Repositorio de empresas (subset de ICompanyRepository). */
export interface ICompanyProfileRepository {
  findById(id: string): Promise<Company | null>;
  updateProfile(companyId: string, data: Partial<UpdateCompanyProfileDto>): Promise<Company | null>;
}

/** Repositorio de usuarios (subset de IUserRepository). */
export interface IUserProfileRepository {
  findAll(filter?: Partial<{ companyId: string }>): Promise<Array<{ email: string }>>;
}

/** Dependencias del servicio de perfil de empresa. */
export interface CompanyProfileServiceDeps {
  companyRepository: ICompanyProfileRepository;
  userRepository: IUserProfileRepository;
  storageService: IStorageService;
}

/** Resultado de obtener el perfil de empresa. */
export interface CompanyProfileResult {
  id: string;
  name: string;
  country: string;
  category: string;
  size: string;
  phone: string | null;
  logo: string | null;
  referralSource: string | null;
  escalationTimeoutMinutes?: number;
  email: string;
}

/** Resultado de generar presigned URL para logo. */
export interface UploadUrlResult {
  uploadUrl: string;
  logoUrl: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Expiración de la presigned URL en segundos (5 minutos). */
const PRESIGNED_URL_EXPIRATION_SECONDS = 300;

/** Regex para sanitizar nombre de archivo (solo alfanuméricos, guiones, puntos y underscores). */
const FILENAME_SANITIZE_REGEX = /[^a-zA-Z0-9.\-_]/g;

// ─── Service ─────────────────────────────────────────────────────────────────

export class CompanyProfileService {
  private readonly deps: CompanyProfileServiceDeps;

  constructor(deps: CompanyProfileServiceDeps) {
    this.deps = deps;
  }

  /**
   * Obtiene el perfil de empresa con el email del usuario asociado.
   *
   * @param companyId - ID de la empresa (del JWT)
   * @returns Datos del perfil incluyendo email (solo lectura)
   * @throws {CompanyNotFoundError} Si la empresa no existe
   */
  async getProfile(companyId: string): Promise<CompanyProfileResult> {
    const company = await this.deps.companyRepository.findById(companyId);
    if (!company) {
      throw new CompanyNotFoundError(companyId);
    }

    // Obtener email del usuario asociado a la empresa
    const users = await this.deps.userRepository.findAll({ companyId });
    const email = users.length > 0 ? users[0].email : '';

    return {
      id: company.id,
      name: company.name,
      country: company.country,
      category: company.category,
      size: company.size,
      phone: company.phone ?? null,
      logo: company.logo ?? null,
      referralSource: company.referralSource ?? null,
      escalationTimeoutMinutes: company.escalationTimeoutMinutes,
      email,
    };
  }

  /**
   * Actualiza el perfil de empresa.
   * Valida y sanitiza los datos antes de persistirlos.
   *
   * @param companyId - ID de la empresa (del JWT)
   * @param data - Datos a actualizar (PATCH parcial)
   * @returns Empresa actualizada
   * @throws {CompanyNotFoundError} Si la empresa no existe
   * @throws {InvalidProfileDataError} Si los datos son inválidos
   */
  async updateProfile(companyId: string, data: UpdateCompanyProfileDto): Promise<Company> {
    // Validar y sanitizar datos
    const validatedData = validateProfileUpdate(data);

    // Verificar que la empresa existe y actualizar
    const updatedCompany = await this.deps.companyRepository.updateProfile(companyId, validatedData);
    if (!updatedCompany) {
      throw new CompanyNotFoundError(companyId);
    }

    return updatedCompany;
  }

  /**
   * Genera una presigned URL para subir el logo de la empresa.
   *
   * @param companyId - ID de la empresa (del JWT)
   * @param contentType - MIME type del archivo (image/png o image/jpeg)
   * @param fileName - Nombre original del archivo
   * @returns Presigned URL para upload y URL pública del logo
   * @throws {InvalidContentTypeError} Si el content type no es permitido
   * @throws {CompanyNotFoundError} Si la empresa no existe
   * @throws {LogoUploadError} Si falla la generación de la URL
   */
  async generateLogoUploadUrl(
    companyId: string,
    contentType: string,
    fileName: string,
  ): Promise<UploadUrlResult> {
    // Validar content type
    validateLogoContentType(contentType);

    // Verificar que la empresa existe
    const company = await this.deps.companyRepository.findById(companyId);
    if (!company) {
      throw new CompanyNotFoundError(companyId);
    }

    // Generar key única para S3
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeText(fileName).replace(FILENAME_SANITIZE_REGEX, '_');
    const key = `logos/${companyId}/${timestamp}-${sanitizedFileName}`;

    try {
      // Generar presigned URL
      const uploadUrl = await this.deps.storageService.generatePresignedUploadUrl(
        key,
        contentType,
        PRESIGNED_URL_EXPIRATION_SECONDS,
      );

      // Obtener URL pública del logo
      const logoUrl = this.deps.storageService.getPublicUrl(key);

      return { uploadUrl, logoUrl };
    } catch (error) {
      if (error instanceof Error) {
        throw new LogoUploadError(error.message);
      }
      throw new LogoUploadError('Error desconocido al generar URL de carga');
    }
  }

  /**
   * Elimina el logo de la empresa.
   * Obtiene la URL actual, elimina el objeto de S3 y actualiza la BD con logo=null.
   *
   * @param companyId - ID de la empresa (del JWT)
   * @throws {CompanyNotFoundError} Si la empresa no existe
   */
  async deleteLogo(companyId: string): Promise<void> {
    const company = await this.deps.companyRepository.findById(companyId);
    if (!company) {
      throw new CompanyNotFoundError(companyId);
    }

    // Si la empresa tiene logo, eliminar de S3
    if (company.logo) {
      try {
        // Extraer key del logo desde la URL
        const logoKey = this.extractKeyFromUrl(company.logo);
        if (logoKey) {
          await this.deps.storageService.deleteObject(logoKey);
        }
      } catch {
        // Si falla la eliminación de S3, continuamos con la actualización de BD
        // El objeto huérfano se puede limpiar con un job posterior
      }
    }

    // Actualizar BD con logo=null
    await this.deps.companyRepository.updateProfile(companyId, { logo: null });
  }

  /**
   * Extrae la key de S3 desde una URL pública del logo.
   * Asume que la URL contiene el path `logos/{companyId}/...`.
   */
  private extractKeyFromUrl(url: string): string | null {
    const logosIndex = url.indexOf('logos/');
    if (logosIndex === -1) {
      return null;
    }
    return url.substring(logosIndex);
  }
}
