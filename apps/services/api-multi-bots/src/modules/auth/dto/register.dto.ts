import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanySize, ServiceCategory, ReferralSource } from '@multibotagents/types';

/**
 * DTO de entrada para el registro de empresa y usuario.
 *
 * @example
 * {
 *   "companyName": "Mi Empresa SAS",
 *   "email": "admin@miempresa.com",
 *   "password": "SecurePass1",
 *   "country": "CO",
 *   "category": "sales",
 *   "size": "2-5"
 * }
 */
export class RegisterRequestDto {
  @ApiProperty({
    description: 'Nombre de la empresa. Se sanitiza (trim) antes de almacenar.',
    example: 'Mi Empresa SAS',
    minLength: 1,
    maxLength: 100,
  })
  companyName!: string;

  @ApiProperty({
    description: 'Email del administrador. Se normaliza a minúsculas. Debe ser único en el sistema.',
    example: 'admin@miempresa.com',
    format: 'email',
  })
  email!: string;

  @ApiProperty({
    description: 'Contraseña del usuario. Requisitos: mínimo 8 caracteres, al menos 1 mayúscula y 1 número.',
    example: 'SecurePass1',
    minLength: 8,
    format: 'password',
  })
  password!: string;

  @ApiProperty({
    description: 'Código de país ISO 3166-1 alpha-2.',
    example: 'CO',
    minLength: 2,
    maxLength: 2,
  })
  country!: string;

  @ApiProperty({
    description: 'Categoría principal de servicios de la empresa.',
    enum: ServiceCategory,
    example: ServiceCategory.SALES,
  })
  category!: ServiceCategory;

  @ApiProperty({
    description: 'Tamaño de la empresa (número de empleados).',
    enum: CompanySize,
    example: CompanySize.TWO_TO_FIVE,
  })
  size!: CompanySize;

  @ApiPropertyOptional({
    description: 'Número de teléfono sin código de país.',
    example: '3001234567',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Código de país del teléfono (incluye +).',
    example: '+57',
  })
  phoneCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Fuente por la cual el usuario conoció la plataforma.',
    enum: ReferralSource,
    example: ReferralSource.GOOGLE,
  })
  referralSource?: ReferralSource;

  @ApiPropertyOptional({
    description: 'Token CAPTCHA del challenge del frontend. En desarrollo se puede omitir.',
    example: '03AGdBq24...',
  })
  captchaToken?: string;
}
