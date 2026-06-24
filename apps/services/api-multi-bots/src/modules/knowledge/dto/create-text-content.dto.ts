import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para la creación directa de contenido textual en la base de conocimiento.
 * Permite agregar información sin necesidad de subir un archivo.
 */
export class CreateTextContentDto {
  @ApiProperty({
    description: 'Identificador del agente al que se asocia el contenido.',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'El agentId debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El agentId es obligatorio.' })
  agentId!: string;

  @ApiProperty({
    description: 'Título del contenido textual.',
    example: 'Política de devoluciones',
  })
  @IsString({ message: 'El título debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El título es obligatorio.' })
  title!: string;

  @ApiProperty({
    description: 'Contenido textual a indexar. No puede estar vacío ni contener solo espacios en blanco.',
    example: 'Nuestra política de devoluciones permite cambios dentro de los primeros 30 días...',
  })
  @IsString({ message: 'El contenido debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El contenido es obligatorio.' })
  content!: string;
}
