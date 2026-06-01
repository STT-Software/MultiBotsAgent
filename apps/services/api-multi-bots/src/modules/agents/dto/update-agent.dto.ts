import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para la configuración de personalidad del agente.
 */
export class PersonalityConfigDto {
  @ApiProperty({
    description: 'Nombre público del agente en el chat.',
    example: 'Sofía',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty({
    description: 'Tono conversacional del agente.',
    example: 'profesional',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tone!: string;

  @ApiProperty({
    description: 'Restricciones y reglas de comportamiento de negocio.',
    example: ['no dar información de precios especiales sin cupón', 'no hablar de competidores'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  restrictions!: string[];

  @ApiProperty({
    description: 'Instrucciones cognitivas específicas para el LLM.',
    example: 'Eres una asistente de soporte al cliente experta en cortes de cabello.',
  })
  @IsString()
  @IsNotEmpty()
  instructions!: string;
}

/**
 * DTO para actualizar la configuración de un agente.
 */
export class UpdateAgentDto {
  @ApiPropertyOptional({
    description: 'Nombre interno de identificación del agente.',
    example: 'Agente RAG Barbería',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Idioma preferido para las respuestas (código de 2 letras).',
    example: 'es',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({
    description: 'Mensaje proactivo de bienvenida que se inyecta al inicio del chat.',
    example: 'Hola, soy Sofía. ¿En qué puedo ayudarte hoy?',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  welcomeMessage?: string;

  @ApiPropertyOptional({
    description: 'Configuración detallada de la personalidad y restricciones.',
    type: PersonalityConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonalityConfigDto)
  personality?: PersonalityConfigDto;
}
