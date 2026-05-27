import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Contenido del mensaje', example: 'Hola, te ayudo con tu consulta.' })
  @IsString()
  @IsNotEmpty({ message: 'El contenido del mensaje es obligatorio' })
  content!: string;

  @ApiProperty({ description: 'Tipo de mensaje', enum: ['text', 'image', 'file'], example: 'text' })
  @IsEnum(['text', 'image', 'file'], { message: 'El tipo debe ser text, image o file' })
  type!: 'text' | 'image' | 'file';

  @ApiPropertyOptional({ description: 'URL del archivo (requerido para image/file)', example: 'https://s3.amazonaws.com/...' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.type === 'image' || o.type === 'file')
  @IsNotEmpty({ message: 'fileUrl es requerido para mensajes de tipo image o file' })
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Nombre del archivo', example: 'documento.pdf' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'Tamaño del archivo en bytes', example: 1024000 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type del archivo', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  fileMimeType?: string;
}
