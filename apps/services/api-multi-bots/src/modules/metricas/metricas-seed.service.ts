import { Injectable, Inject, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import type { IMetricEventRepository, MetricEventDocument } from '@multibotagents/db';
import type { MetricEventType } from '@multibotagents/types';

type SeedResult = { created: number } | { skipped: true };

/**
 * Genera eventos de métricas de ejemplo para desarrollo y testing.
 *
 * Inserta 52 eventos variados distribuidos en los últimos 30 días,
 * cubriendo todos los MetricEventType definidos en el contrato.
 * Si ya existen eventos para la empresa, no duplica (idempotente).
 */
@Injectable()
export class MetricasSeedService {
  private readonly logger = new Logger(MetricasSeedService.name);

  constructor(
    @Inject('METRIC_EVENT_REPO')
    private readonly repo: IMetricEventRepository,
  ) {}

  async seedForCompany(companyId: string): Promise<SeedResult> {
    // Verificar si ya existe seed data para esta empresa
    const count = await this.repo.countByCompany(companyId);
    if (count > 0) {
      this.logger.log(`Seed skipped for company ${companyId} — already has ${count} events`);
      return { skipped: true };
    }

    const eventos = this.buildSeedEvents(companyId);
    await this.repo.insertMany(eventos);

    this.logger.log(`Seeded ${eventos.length} metric events for company ${companyId}`);
    return { created: eventos.length };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private buildSeedEvents(companyId: string): Omit<MetricEventDocument, '_id'>[] {
    const companyObjectId = new ObjectId(companyId);
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    /** Genera un Date aleatorio dentro de los últimos 30 días */
    const randomDate = (): Date =>
      new Date(now - Math.random() * thirtyDays);

    const agentes: Array<{ id: string; type: 'rag' | 'cotizador' | 'agendamiento' }> = [
      { id: 'agt-rag-001', type: 'rag' },
      { id: 'agt-cot-001', type: 'cotizador' },
      { id: 'agt-age-001', type: 'agendamiento' },
    ];

    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Todos los tipos de evento definidos en el contrato
    const allEventTypes: MetricEventType[] = [
      'conversation.completed',
      'conversation.escalated',
      'rag.no_answer',
      'rag.topic_identified',
      'order.initiated',
      'order.confirmed',
      'order.abandoned',
      'appointment.scheduled',
      'appointment.cancelled',
      'appointment.rescheduled',
      'escalation.opened',
      'escalation.resolved',
      'escalation.timeout',
    ];

    const eventos: Omit<MetricEventDocument, '_id'>[] = [];
    const createdAt = new Date();

    // Garantizar al menos un evento de cada tipo (13 eventos base)
    for (const eventType of allEventTypes) {
      const agente = pick(agentes);
      eventos.push({
        companyId: companyObjectId,
        agentId: agente.id,
        agentType: agente.type,
        eventType,
        timestamp: randomDate(),
        metadata: this.buildMetadata(eventType),
        createdAt,
      });
    }

    // Completar hasta 52 eventos con distribución variada
    const remaining = 52 - eventos.length;
    for (let i = 0; i < remaining; i++) {
      const agente = pick(agentes);
      const eventType = pick(allEventTypes);
      eventos.push({
        companyId: companyObjectId,
        agentId: agente.id,
        agentType: agente.type,
        eventType,
        timestamp: randomDate(),
        metadata: this.buildMetadata(eventType),
        createdAt,
      });
    }

    return eventos;
  }

  /** Genera metadata realista según el tipo de evento */
  private buildMetadata(eventType: MetricEventType): Record<string, unknown> {
    switch (eventType) {
      case 'conversation.completed':
        return { durationSeconds: Math.floor(Math.random() * 300 + 30), messageCount: Math.floor(Math.random() * 10 + 2) };
      case 'conversation.escalated':
        return { reason: 'El usuario solicitó hablar con un humano', escalationType: 'explicit' };
      case 'rag.no_answer':
        return { query: 'Consulta sin respuesta disponible en la base de conocimiento' };
      case 'rag.topic_identified':
        return { topic: 'soporte_tecnico', confidence: +(Math.random() * 0.4 + 0.6).toFixed(2) };
      case 'order.initiated':
        return { productId: `prod-${Math.floor(Math.random() * 100)}`, amount: +(Math.random() * 500 + 10).toFixed(2) };
      case 'order.confirmed':
        return { orderId: `ord-${Math.floor(Math.random() * 1000)}`, amount: +(Math.random() * 500 + 10).toFixed(2) };
      case 'order.abandoned':
        return { step: 'payment', productId: `prod-${Math.floor(Math.random() * 100)}` };
      case 'appointment.scheduled':
        return { appointmentDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), serviceType: 'consulta' };
      case 'appointment.cancelled':
        return { reason: 'El usuario canceló la cita', hoursBeforeAppointment: Math.floor(Math.random() * 48 + 1) };
      case 'appointment.rescheduled':
        return { originalDate: new Date(Date.now() - 86400000).toISOString(), newDate: new Date(Date.now() + 86400000).toISOString() };
      case 'escalation.opened':
        return { reason: 'El agente no tiene información sobre el producto solicitado.', escalationType: 'agent_detected' };
      case 'escalation.resolved':
        return { resolvedAt: new Date().toISOString(), durationMinutes: Math.floor(Math.random() * 30 + 5), resolvedBy: 'operador@empresa.com' };
      case 'escalation.timeout':
        return { timeoutMinutes: 60 };
      default:
        return {};
    }
  }
}
