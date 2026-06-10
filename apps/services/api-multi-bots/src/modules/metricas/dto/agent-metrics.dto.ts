import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AgentType } from '@multibotagents/db';
import type { MetricPeriod } from './period-query.dto';
import { TopicCountDto } from './general-metrics.dto';

export class ProductCountDto {
  @ApiProperty({ description: 'Identificador del producto.' })
  declare productId: string;

  @ApiProperty({ description: 'Cantidad de veces que apareció en eventos order.initiated.' })
  declare count: number;
}

export class HourCountDto {
  @ApiProperty({ description: 'Hora del día (0-23).' })
  declare hour: number;

  @ApiProperty({ description: 'Cantidad de citas agendadas en esa hora.' })
  declare count: number;
}

export class AgentMetricsDto {
  @ApiProperty({
    enum: ['rag', 'cotizador', 'agendamiento'],
    description: 'Tipo de agente consultado.',
  })
  declare agentType: AgentType;

  @ApiPropertyOptional({
    description: 'ID del agente específico consultado. Presente solo en GET /agente/:agentId.',
  })
  agentId?: string;

  @ApiProperty({
    enum: ['24h', '7d', '30d'],
    description: 'Período de tiempo consultado.',
  })
  declare period: MetricPeriod;

  @ApiProperty({
    description:
      'Tasa de éxito (0-1): conversaciones resueltas / total conversaciones del agente. ' +
      'Aplica a todos los tipos. 0 si no hay conversaciones.',
  })
  declare successRate: number;

  // ── RAG ────────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Conteo de preguntas sin respuesta (rag.no_answer).' })
  noAnswerCount?: number;

  @ApiPropertyOptional({
    type: [TopicCountDto],
    description: 'Top 10 temas más consultados (rag.topic_identified). Solo para agentType=rag.',
  })
  topTopics?: TopicCountDto[];

  // ── Cotizador ──────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    type: [ProductCountDto],
    description: 'Top 10 productos más solicitados (order.initiated). Solo para agentType=cotizador.',
  })
  topProducts?: ProductCountDto[];

  @ApiPropertyOptional({ description: 'Conteo de eventos order.confirmed.' })
  ordersConfirmed?: number;

  @ApiPropertyOptional({ description: 'Conteo de eventos order.abandoned.' })
  ordersAbandoned?: number;

  @ApiPropertyOptional({
    description:
      'Tasa de conversión (0-1): order.confirmed / order.initiated. ' +
      '0 si no hay order.initiated.',
  })
  conversionRate?: number;

  // ── Agendamiento ───────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Conteo de eventos appointment.scheduled.' })
  appointmentsScheduled?: number;

  @ApiPropertyOptional({ description: 'Conteo de eventos appointment.cancelled.' })
  appointmentsCancelled?: number;

  @ApiPropertyOptional({ description: 'Conteo de eventos appointment.rescheduled.' })
  appointmentsRescheduled?: number;

  @ApiPropertyOptional({
    type: [HourCountDto],
    description:
      'Distribución de citas agendadas por hora del día (0-23). ' +
      'Solo incluye horas con count > 0. Solo para agentType=agendamiento.',
  })
  peakHours?: HourCountDto[];
}
