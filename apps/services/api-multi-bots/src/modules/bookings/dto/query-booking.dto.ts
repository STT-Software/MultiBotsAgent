import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsMongoId, IsEnum, IsDateString } from 'class-validator';

export class QueryBookingDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID del agente.',
    example: '60d5ec49f1b29c3a388fbf01',
  })
  @IsMongoId()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por número de teléfono del cliente.',
    example: '+5491123456789',
  })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado de la reserva.',
    example: 'confirmed',
    enum: ['confirmed', 'cancelled', 'rescheduled'],
  })
  @IsEnum(['confirmed', 'cancelled', 'rescheduled'])
  @IsOptional()
  status?: 'confirmed' | 'cancelled' | 'rescheduled';

  @ApiPropertyOptional({
    description: 'Fecha inicial para filtro de rango (ISO 8601).',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha final para filtro de rango (ISO 8601).',
    example: '2026-06-30T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
