import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de request para generar presigned URL de carga de logo.
 */
export class LogoUploadUrlRequestDto {
  @ApiProperty({
    description: 'Tipo de contenido del archivo. Solo se aceptan image/png e image/jpeg.',
    enum: ['image/png', 'image/jpeg'],
    example: 'image/png',
  })
  contentType!: 'image/png' | 'image/jpeg';

  @ApiProperty({
    description: 'Nombre del archivo original.',
    example: 'logo-empresa.png',
  })
  fileName!: string;
}

/**
 * DTO de respuesta con las URLs para carga de logo.
 */
export class LogoUploadUrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL para subir el archivo directamente a S3 (PUT).',
    example: 'https://bucket.s3.us-east-1.amazonaws.com/logos/abc/1234-logo.png?X-Amz-...',
  })
  uploadUrl!: string;

  @ApiProperty({
    description: 'URL pública del logo una vez subido.',
    example: 'https://bucket.s3.us-east-1.amazonaws.com/logos/abc/1234-logo.png',
  })
  logoUrl!: string;
}
