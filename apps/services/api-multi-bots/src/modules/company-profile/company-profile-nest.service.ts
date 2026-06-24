import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  CompanyProfileService,
} from '@multibotagents/core';
import type {
  ICompanyProfileRepository,
  IUserProfileRepository,
  CompanyProfileResult,
  UploadUrlResult,
  IStorageService,
} from '@multibotagents/core';
import type { Company, UpdateCompanyProfileDto } from '@multibotagents/types';

/**
 * Servicio NestJS que actúa como puente entre el controlador y el servicio de dominio.
 * Inyecta las dependencias de infraestructura y las pasa al CompanyProfileService del core.
 */
@Injectable()
export class CompanyProfileNestService {
  private readonly coreService: CompanyProfileService;
  private readonly logger = new Logger(CompanyProfileNestService.name);

  constructor(
    @Inject('COMPANY_REPO') companyRepository: ICompanyProfileRepository,
    @Inject('USER_REPO') userRepository: IUserProfileRepository,
    @Inject('STORAGE_SERVICE') storageService: IStorageService,
  ) {
    this.coreService = new CompanyProfileService({
      companyRepository,
      userRepository,
      storageService,
    });
    this.logger.log('CompanyProfileService initialized successfully');
  }

  /**
   * Obtiene el perfil de empresa con el email del usuario asociado.
   */
  async getProfile(companyId: string): Promise<CompanyProfileResult> {
    return this.coreService.getProfile(companyId);
  }

  /**
   * Actualiza el perfil de empresa (validación + sanitización + persistencia).
   */
  async updateProfile(companyId: string, data: UpdateCompanyProfileDto): Promise<Company> {
    return this.coreService.updateProfile(companyId, data);
  }

  /**
   * Genera una presigned URL para subir el logo de la empresa.
   */
  async generateLogoUploadUrl(
    companyId: string,
    contentType: string,
    fileName: string,
  ): Promise<UploadUrlResult> {
    return this.coreService.generateLogoUploadUrl(companyId, contentType, fileName);
  }

  /**
   * Elimina el logo de la empresa (S3 + BD).
   */
  async deleteLogo(companyId: string): Promise<void> {
    return this.coreService.deleteLogo(companyId);
  }
}
