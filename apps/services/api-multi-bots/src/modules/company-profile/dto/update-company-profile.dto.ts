import { ApiPropertyOptional } from '@nestjs/swagger';
import { CompanySize, ServiceCategory, ReferralSource } from '@multibotagents/types';

/**
 * DTO para actualizar el perfil de empresa (PATCH parcial).
 * Todos los campos son opcionales. La validación de negocio se realiza en el core.
 *
 * @example
 * {
 *   "name": "Mi Empresa Actualizada",
 *   "country": "CO",
 *   "category": "sales",
 *   "size": "2-5"
 * }
 */
export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({
    description: 'Nombre de la empresa. Máximo 100 caracteres.',
    example: 'Mi Empresa SAS',
    maxLength: 100,
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Código de país ISO 3166-1 alpha-2.',
    example: 'CO',
    minLength: 2,
    maxLength: 2,
  })
  country?: string;

  @ApiPropertyOptional({
    description: 'Categoría principal de servicios de la empresa.',
    enum: ServiceCategory,
    example: ServiceCategory.SALES,
  })
  category?: ServiceCategory;

  @ApiPropertyOptional({
    description: 'Tamaño de la empresa (número de empleados).',
    enum: CompanySize,
    example: CompanySize.TWO_TO_FIVE,
  })
  size?: CompanySize;

  @ApiPropertyOptional({
    description: 'Teléfono con código de país. Enviar null para eliminar.',
    example: '+573001234567',
    nullable: true,
  })
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'URL del logo en S3. Enviar null para eliminar.',
    example: 'https://bucket.s3.us-east-1.amazonaws.com/logos/abc/logo.png',
    nullable: true,
  })
  logo?: string | null;

  @ApiPropertyOptional({
    description: 'Fuente por la cual el usuario conoció la plataforma. Enviar null para eliminar.',
    enum: ReferralSource,
    example: ReferralSource.GOOGLE,
    nullable: true,
  })
  referralSource?: ReferralSource | null;

  @ApiPropertyOptional({
    description: 'Timeout de auto-devolución de escalamiento en minutos (entre 5 y 1440).',
    example: 60,
    minimum: 5,
    maximum: 1440,
  })
  escalationTimeoutMinutes?: number;
}
