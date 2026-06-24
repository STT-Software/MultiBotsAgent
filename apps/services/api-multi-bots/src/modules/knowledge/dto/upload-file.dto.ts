import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO para la carga de archivos a la base de conocimiento.
 * El archivo se envía como multipart/form-data junto con estos campos.
 */
export class UploadFileDto {
  @ApiProperty({
    description: 'Identificador del agente al que se asocia el archivo.',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'El agentId debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El agentId es obligatorio.' })
  agentId!: string;

  @ApiPropertyOptional({
    description: 'Título descriptivo del documento. Si no se proporciona, se usa el nombre del archivo.',
    example: 'Manual de usuario v2',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'El título debe ser una cadena de texto.' })
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres.' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Categoría para organizar el documento dentro de la base de conocimiento.',
    example: 'manuales',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'La categoría debe ser una cadena de texto.' })
  @MaxLength(100, { message: 'La categoría no puede exceder 100 caracteres.' })
  category?: string;
}
