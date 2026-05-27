import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export class UploadUrlRequestDto {
  @ApiProperty({ description: 'Nombre del archivo', example: 'documento.pdf' })
  @IsString()
  @IsNotEmpty({ message: 'fileName es obligatorio' })
  fileName!: string;

  @ApiProperty({
    description: 'Content-Type del archivo',
    example: 'application/pdf',
    enum: ALLOWED_CONTENT_TYPES,
  })
  @IsString()
  @IsIn(ALLOWED_CONTENT_TYPES, { message: 'Tipo de archivo no permitido' })
  contentType!: string;
}

export class UploadUrlResponseDto {
  @ApiProperty({ description: 'Presigned URL para subir el archivo a S3' })
  uploadUrl!: string;

  @ApiProperty({ description: 'Key del archivo en S3' })
  fileKey!: string;

  @ApiProperty({ description: 'URL pública del archivo una vez subido' })
  publicUrl!: string;
}
