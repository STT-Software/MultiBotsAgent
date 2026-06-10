import { Inject, Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import type { MetricEventRepository, AgentFilter, AgentType } from '@multibotagents/db';
import { AgentMetricsDto, ProductCountDto, HourCountDto } from './dto/agent-metrics.dto';
import { TopicCountDto } from './dto/general-metrics.dto';
import { type MetricPeriod, PERIOD_TO_MS } from './dto/period-query.dto';

@Injectable()
export class MetricasPorAgenteService {
  constructor(
    @Inject('METRIC_EVENT_REPO')
    private readonly repo: MetricEventRepository,
  ) {}

  /**
   * Detecta el agentType buscando el primer evento del agente en la empresa.
   * No usa filtro de timestamp — busca en toda la historia del agente.
   * Retorna null si el agente no tiene ningún evento registrado.
   */
  private async detectAgentType(
    companyId: ObjectId,
    agentId: string,
  ): Promise<AgentType | null> {
    const doc = await (this.repo as any).collection.findOne(
      { companyId, agentId },
      { projection: { agentType: 1 } },
    );
    return (doc?.agentType as AgentType) ?? null;
  }

  /**
   * Retorna métricas de un agente específico identificado por agentId.
   * Detecta el agentType automáticamente desde la base de datos.
   * Si el agente no tiene eventos, retorna DTO vacío con successRate: 0.
   */
  async getByAgentId(
    companyId: string,
    agentId: string,
    period: MetricPeriod,
  ): Promise<AgentMetricsDto> {
    const since = new Date(Date.now() - PERIOD_TO_MS[period]);
    const companyOid = new ObjectId(companyId);

    const agentType = await this.detectAgentType(companyOid, agentId);

    if (!agentType) {
      // Agente sin historial — retornar DTO vacío
      const dto = new AgentMetricsDto();
      dto.agentType = 'rag'; // fallback que no importa porque no hay datos
      dto.agentId = agentId;
      dto.period = period;
      dto.successRate = 0;
      return dto;
    }

    const agentFilter: AgentFilter = { type: 'byId', agentId };
    return this.dispatch(agentType, agentFilter, companyOid, period, since, agentId);
  }

  /**
   * Retorna métricas agregadas de todos los agentes de un tipo en la empresa.
   */
  async getByAgentType(
    companyId: string,
    agentType: AgentType,
    period: MetricPeriod,
  ): Promise<AgentMetricsDto> {
    const since = new Date(Date.now() - PERIOD_TO_MS[period]);
    const companyOid = new ObjectId(companyId);
    const agentFilter: AgentFilter = { type: 'byType', agentType };
    return this.dispatch(agentType, agentFilter, companyOid, period, since);
  }

  // ─── Dispatcher ────────────────────────────────────────────────────────────

  private async dispatch(
    agentType: AgentType,
    agentFilter: AgentFilter,
    companyId: ObjectId,
    period: MetricPeriod,
    since: Date,
    agentId?: string,
  ): Promise<AgentMetricsDto> {
    let dto: AgentMetricsDto;

    switch (agentType) {
      case 'rag':
        dto = await this.calcRagMetrics(companyId, agentFilter, since);
        break;
      case 'cotizador':
        dto = await this.calcCotizadorMetrics(companyId, agentFilter, since);
        break;
      case 'agendamiento':
        dto = await this.calcAgendamientoMetrics(companyId, agentFilter, since);
        break;
    }

    dto.agentType = agentType;
    dto.period = period;
    if (agentId) dto.agentId = agentId;

    return dto;
  }

  // ─── Cálculo de métricas por tipo ──────────────────────────────────────────

  private async calcRagMetrics(
    companyId: ObjectId,
    agentFilter: AgentFilter,
    since: Date,
  ): Promise<AgentMetricsDto> {
    const [total, resolved, noAnswerCount, topTopicsRaw] = await Promise.all([
      this.repo.countByAgentAndEventTypes(
        companyId, agentFilter,
        ['conversation.completed', 'conversation.escalated'],
        since,
      ),
      this.repo.countByAgentEventTypeAndMeta(
        companyId, agentFilter,
        'conversation.completed', 'resolved', true, since,
      ),
      this.repo.countByAgentAndEventTypes(
        companyId, agentFilter, ['rag.no_answer'], since,
      ),
      this.repo.topAgentValuesByMetaField(
        companyId, agentFilter, 'rag.topic_identified', 'topic', 10, since,
      ),
    ]);

    const dto = new AgentMetricsDto();
    dto.successRate = total > 0 ? resolved / total : 0;
    dto.noAnswerCount = noAnswerCount;
    dto.topTopics = topTopicsRaw.map((t): TopicCountDto => {
      const item = new TopicCountDto();
      (item as any).topic = t.value;
      (item as any).count = t.count;
      return item;
    });
    return dto;
  }

  private async calcCotizadorMetrics(
    companyId: ObjectId,
    agentFilter: AgentFilter,
    since: Date,
  ): Promise<AgentMetricsDto> {
    const [total, resolved, initiated, ordersConfirmed, ordersAbandoned, topProductsRaw] =
      await Promise.all([
        this.repo.countByAgentAndEventTypes(
          companyId, agentFilter,
          ['conversation.completed', 'conversation.escalated'],
          since,
        ),
        this.repo.countByAgentEventTypeAndMeta(
          companyId, agentFilter,
          'conversation.completed', 'resolved', true, since,
        ),
        this.repo.countByAgentAndEventTypes(
          companyId, agentFilter, ['order.initiated'], since,
        ),
        this.repo.countByAgentAndEventTypes(
          companyId, agentFilter, ['order.confirmed'], since,
        ),
        this.repo.countByAgentAndEventTypes(
          companyId, agentFilter, ['order.abandoned'], since,
        ),
        this.repo.topAgentValuesByArrayMetaField(
          companyId, agentFilter, 'order.initiated', 'productIds', 10, since,
        ),
      ]);

    const dto = new AgentMetricsDto();
    dto.successRate = total > 0 ? resolved / total : 0;
    dto.ordersConfirmed = ordersConfirmed;
    dto.ordersAbandoned = ordersAbandoned;
    dto.conversionRate = initiated > 0 ? ordersConfirmed / initiated : 0;
    dto.topProducts = topProductsRaw.map((p): ProductCountDto => {
      const item = new ProductCountDto();
      (item as any).productId = p.value;
      (item as any).count = p.count;
      return item;
    });
    return dto;
  }

  private async calcAgendamientoMetrics(
    companyId: ObjectId,
    agentFilter: AgentFilter,
    since: Date,
  ): Promise<AgentMetricsDto> {
    const [total, resolved, scheduled, cancelled, rescheduled, peakHoursRaw] =
      await Promise.all([
        this.repo.countByAgentAndEventTypes(
          companyId, agentFilter,
          ['conversation.completed', 'conversation.escalated'],
          since,
        ),
        this.repo.countByAgentEventTypeAndMeta(
          companyId, agentFilter,
          'conversation.completed', 'resolved', true, since,
        ),
        this.repo.countByAgentAndEventTypes(
          companyId, agentFilter, ['appointment.scheduled'], since,
        ),
        this.repo.countByAgentAndEventTypes(
          companyId, agentFilter, ['appointment.cancelled'], since,
        ),
        this.repo.countByAgentAndEventTypes(
          companyId, agentFilter, ['appointment.rescheduled'], since,
        ),
        this.repo.distributionByMetaHour(
          companyId, agentFilter, 'appointment.scheduled', 'scheduledAt', since,
        ),
      ]);

    const dto = new AgentMetricsDto();
    dto.successRate = total > 0 ? resolved / total : 0;
    dto.appointmentsScheduled = scheduled;
    dto.appointmentsCancelled = cancelled;
    dto.appointmentsRescheduled = rescheduled;
    dto.peakHours = peakHoursRaw.map((h): HourCountDto => {
      const item = new HourCountDto();
      (item as any).hour = h.hour;
      (item as any).count = h.count;
      return item;
    });
    return dto;
  }
}
