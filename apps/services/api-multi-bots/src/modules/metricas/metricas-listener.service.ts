import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ObjectId } from 'mongodb';
import type { MetricEventPayload } from '@multibotagents/types';
import { buildMetricEventDocument } from '@multibotagents/db';
import type { IMetricEventRepository } from '@multibotagents/db';
import { Inject } from '@nestjs/common';
import { MetricasWsGateway } from './metricas-ws.gateway';

/**
 * Escucha el evento interno "metric.event" y persiste el payload en MongoDB.
 *
 * Patrón fire-and-forget:
 * - El emisor NO await-ea la respuesta del listener.
 * - Si la persistencia falla, se loguea el error pero NO se re-lanza.
 * - El emisor nunca es bloqueado ni afectado por fallos del módulo de métricas.
 */
@Injectable()
export class MetricasListenerService {
  private readonly logger = new Logger(MetricasListenerService.name);

  constructor(
    @Inject('METRIC_EVENT_REPO')
    private readonly metricEventRepo: IMetricEventRepository,
    private readonly wsGateway: MetricasWsGateway,
  ) {}

  @OnEvent('metric.event')
  async handleMetricEvent(payload: MetricEventPayload): Promise<void> {
    try {
      const doc = buildMetricEventDocument(payload);
      await this.metricEventRepo.create(doc);

      // Emitir al frontend en tiempo real (Slice 4)
      try {
        // Contadores del bloque "EN VIVO": acumulados desde el inicio del día actual.
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const companyOid = new ObjectId(payload.companyId);

        const [conversationsResolved, escalationsOpen] = await Promise.all([
          this.metricEventRepo.countByEventTypeAndMeta(
            companyOid,
            'conversation.completed',
            'resolved',
            true,
            startOfToday,
          ),
          this.metricEventRepo.countByEventTypes(
            companyOid,
            ['escalation.opened'],
            startOfToday,
          ),
        ]);

        this.wsGateway.emitToCompany(payload.companyId, 'metrics.live_update', {
          companyId: payload.companyId,
          agentId: payload.agentId,
          agentType: payload.agentType,
          eventType: payload.eventType,
          timestamp:
            payload.timestamp instanceof Date
              ? payload.timestamp.toISOString()
              : payload.timestamp,
          todayCounters: {
            conversationsResolved,
            // Sin evento directo de "conversación activa" en MetricEventType (pendiente).
            conversationsActive: 0,
            escalationsOpen,
          },
        });
      } catch (wsError) {
        // Si el WS falla, no interrumpir la persistencia
        this.logger.warn('Failed to emit metric event via WebSocket', { wsError });
      }
    } catch (error) {
      // Fire-and-forget: loguear pero NO re-lanzar la excepción.
      // Un fallo aquí nunca debe interrumpir el flujo del emisor.
      this.logger.error('Failed to persist metric event', { error, payload });
    }
  }
}
