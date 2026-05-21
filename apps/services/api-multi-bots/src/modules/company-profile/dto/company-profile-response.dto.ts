import { ApiProperty } from '@nestjs/swagger';
import { CompanySize, ServiceCategory, ReferralSource } from '@multibotagents/types';

/**
 * DTO de respuesta del perfil de empresa.
 * Incluye el email del usuario como campo de solo lectura.
 */
export class CompanyProfileResponseDto {
  @ApiProperty({
    description: 'Identificador único de la empresa.',
    example: '683da2f0e4b0a1c2d3e4f5a5',
  })
  id!: string;

  @ApiProperty({
    description: 'Nombre de la empresa.',
    example: 'Mi Empresa SAS',
  })
  name!: string;

  @ApiProperty({
    description: 'Código de país ISO 3166-1 alpha-2.',
    example: 'CO',
  })
  country!: string;

  @ApiProperty({
    description: 'Categoría principal de servicios.',
    enum: ServiceCategory,
    example: ServiceCategory.SALES,
  })
  category!: ServiceCategory;

  @ApiProperty({
    description: 'Tamaño de la empresa.',
    enum: CompanySize,
    example: CompanySize.TWO_TO_FIVE,
  })
  size!: CompanySize;

  @ApiProperty({
    description: 'Teléfono con código de país.',
    example: '+573001234567',
    nullable: true,
  })
  phone!: string | null;

  @ApiProperty({
    description: 'URL del logo en S3.',
    example: 'https://bucket.s3.us-east-1.amazonaws.com/logos/abc/logo.png',
    nullable: true,
  })
  logo!: string | null;

  @ApiProperty({
    description: 'Fuente de referencia.',
    enum: ReferralSource,
    nullable: true,
    example: ReferralSource.GOOGLE,
  })
  referralSource!: ReferralSource | null;

  @ApiProperty({
    description: 'Email del usuario (solo lectura, no editable).',
    example: 'admin@miempresa.com',
  })
  email!: string;
}
