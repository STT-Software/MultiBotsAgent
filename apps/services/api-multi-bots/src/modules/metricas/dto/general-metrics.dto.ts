import { ApiProperty } from '@nestjs/swagger';
import type { MetricPeriod } from './period-query.dto';

export class TopicCountDto {
  @ApiProperty({ description: 'Tema identificado por el Motor RAG.' })
  declare topic: string;

  @ApiProperty({ description: 'Cantidad de veces que apareció en el período.' })
  declare count: number;
}

export class GeneralMetricsDto {
  @ApiProperty({
    enum: ['24h', '7d', '30d'],
    description: 'Período de tiempo consultado.',
  })
  declare period: MetricPeriod;

  @ApiProperty({
    description: 'Total de conversaciones (completadas + escaladas) en el período.',
  })
  declare totalConversations: number;

  @ApiProperty({
    description:
      'Proporción de conversaciones resueltas sobre el total (0-1). ' +
      '0 si no hay conversaciones en el período.',
  })
  declare resolutionRate: number;

  @ApiProperty({ description: 'Total de escalamientos abiertos en el período.' })
  declare totalEscalations: number;

  @ApiProperty({
    description:
      'Proporción de conversaciones que generaron un escalamiento (0-1). ' +
      '0 si no hay conversaciones en el período.',
  })
  declare escalationRate: number;

  @ApiProperty({
    type: [TopicCountDto],
    description:
      'Top 10 de temas más consultados via el Motor RAG en el período. ' +
      'Array vacío si no hay datos RAG.',
  })
  declare topTopics: TopicCountDto[];

  @ApiProperty({
    description:
      'Promedio de minutos que tomó resolver un escalamiento en el período. ' +
      '0 si no hay escalamientos resueltos.',
  })
  declare avgEscalationResolutionMinutes: number;
}
