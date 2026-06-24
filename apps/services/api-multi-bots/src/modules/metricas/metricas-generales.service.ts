import { Inject, Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import type { MetricEventRepository } from '@multibotagents/db';
import { GeneralMetricsDto, TopicCountDto } from './dto/general-metrics.dto';
import { type MetricPeriod, PERIOD_TO_MS } from './dto/period-query.dto';

@Injectable()
export class MetricasGeneralesService {
  constructor(
    @Inject('METRIC_EVENT_REPO')
    private readonly repo: MetricEventRepository,
  ) {}

  /**
   * Calcula las métricas generales de una empresa para el período dado.
   * Ejecuta las 6 queries en paralelo con Promise.all para minimizar latencia.
   * Nunca lanza error por falta de datos — retorna ceros.
   */
  async getGeneralMetrics(
    companyId: string,
    period: MetricPeriod,
  ): Promise<GeneralMetricsDto> {
    const since = new Date(Date.now() - PERIOD_TO_MS[period]);
    const companyOid = new ObjectId(companyId);

    const [
      totalCompleted,
      totalEscalated,
      resolvedCount,
      escalationsOpened,
      topTopicsRaw,
      avgResolution,
    ] = await Promise.all([
      this.repo.countByEventTypes(companyOid, ['conversation.completed'], since),
      this.repo.countByEventTypes(companyOid, ['conversation.escalated'], since),
      this.repo.countByEventTypeAndMeta(companyOid, 'conversation.completed', 'resolved', true, since),
      this.repo.countByEventTypes(companyOid, ['escalation.opened'], since),
      this.repo.topValuesByMetaField(companyOid, 'rag.topic_identified', 'topic', 10, since),
      this.repo.avgMetaNumberField(companyOid, 'escalation.resolved', 'durationMinutes', since),
    ]);

    const totalConversations = totalCompleted + totalEscalated;

    // Guard: nunca dividir por cero
    const resolutionRate =
      totalConversations > 0 ? resolvedCount / totalConversations : 0;
    const escalationRate =
      totalConversations > 0 ? escalationsOpened / totalConversations : 0;

    // Mapear al formato del DTO
    const topTopics: TopicCountDto[] = topTopicsRaw.map((t) => ({
      topic: t.value,
      count: t.count,
    }));

    const dto = new GeneralMetricsDto();
    dto.period = period;
    dto.totalConversations = totalConversations;
    dto.resolutionRate = resolutionRate;
    dto.totalEscalations = escalationsOpened;
    dto.escalationRate = escalationRate;
    dto.topTopics = topTopics;
    dto.avgEscalationResolutionMinutes = avgResolution;

    return dto;
  }

  /**
   * Obtiene los eventos más recientes de una empresa.
   */
  async getRecentEvents(companyId: string, limit = 10) {
    const companyOid = new ObjectId(companyId);
    const events = await this.repo.findRecent(companyOid, limit);
    return events.map((e) => ({
      id: e._id.toHexString(),
      agentId: e.agentId,
      agentType: e.agentType,
      eventType: e.eventType,
      timestamp: e.timestamp.toISOString(),
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
