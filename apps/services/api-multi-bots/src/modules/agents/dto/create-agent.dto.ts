import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';

export class CreateAgentDto {
  @ApiProperty({
    description: 'Nombre del agente.',
    example: 'Mi Nuevo Agente RAG',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({
    description: 'Tipo de agente.',
    example: 'rag',
    enum: ['rag', 'cotizador', 'agendamiento'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['rag', 'cotizador', 'agendamiento'])
  tipo!: 'rag' | 'cotizador' | 'agendamiento';
}
