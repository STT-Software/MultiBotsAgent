import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsEnum,
} from 'class-validator';

export class UpdateBookingDto {
  @ApiPropertyOptional({
    description: 'Nombre completo del cliente.',
    example: 'Juan Pérez Modificado',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono de WhatsApp del cliente.',
    example: '+5491198765432',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del cliente.',
    example: 'juan.modificado@example.com',
  })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({
    description: 'Nueva fecha y hora de la cita (formato ISO 8601) si se reprograma.',
    example: '2026-06-16T10:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  dateTime?: string;

  @ApiPropertyOptional({
    description: 'Nueva duración de la reserva en minutos.',
    example: 45,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Nuevo estado de la reserva.',
    example: 'rescheduled',
    enum: ['confirmed', 'cancelled', 'rescheduled'],
  })
  @IsEnum(['confirmed', 'cancelled', 'rescheduled'])
  @IsOptional()
  status?: 'confirmed' | 'cancelled' | 'rescheduled';

  @ApiPropertyOptional({
    description: 'Notas o comentarios actualizados.',
    example: 'Cita reprogramada a solicitud del cliente.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
