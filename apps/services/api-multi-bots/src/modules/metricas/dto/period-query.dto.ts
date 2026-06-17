import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type MetricPeriod = '24h' | '7d' | '30d';

export const PERIOD_TO_MS: Record<MetricPeriod, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function sinceDate(period: MetricPeriod): Date {
  return new Date(Date.now() - PERIOD_TO_MS[period]);
}

export class PeriodQueryDto {
  @ApiPropertyOptional({
    enum: ['24h', '7d', '30d'],
    default: '7d',
    description: "Ventana de tiempo para filtrar eventos. Default: '7d'.",
  })
  @IsOptional()
  @IsIn(['24h', '7d', '30d'], {
    message: "El parámetro period debe ser '24h', '7d' o '30d'",
  })
  period?: MetricPeriod = '7d';
}
