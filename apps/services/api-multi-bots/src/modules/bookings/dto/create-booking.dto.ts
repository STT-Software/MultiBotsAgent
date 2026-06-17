import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsEmail,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'ID del agente que procesa el agendamiento.',
    example: '60d5ec49f1b29c3a388fbf01',
  })
  @IsMongoId()
  @IsNotEmpty()
  agentId!: string;

  @ApiProperty({
    description: 'Nombre completo del cliente final.',
    example: 'Juan Pérez',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName!: string;

  @ApiProperty({
    description: 'Número de teléfono de WhatsApp del cliente final.',
    example: '+5491123456789',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  customerPhone!: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del cliente.',
    example: 'juan.perez@example.com',
  })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio de la cita (formato ISO 8601).',
    example: '2026-06-15T14:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  dateTime!: string;

  @ApiPropertyOptional({
    description: 'Duración de la reserva en minutos.',
    example: 60,
    default: 30,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Notas o comentarios adicionales de la cita.',
    example: 'El cliente prefiere llamada por WhatsApp.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
