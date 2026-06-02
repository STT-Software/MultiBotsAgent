import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { MetricEventPayload } from '@multibotagents/types';
import { buildMetricEventDocument } from '@multibotagents/db';
import type { IMetricEventRepository } from '@multibotagents/db';
import { Inject } from '@nestjs/common';

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
  ) {}

  @OnEvent('metric.event')
  async handleMetricEvent(payload: MetricEventPayload): Promise<void> {
    try {
      const doc = buildMetricEventDocument(payload);
      await this.metricEventRepo.create(doc);
    } catch (error) {
      // Fire-and-forget: loguear pero NO re-lanzar la excepción.
      // Un fallo aquí nunca debe interrumpir el flujo del emisor.
      this.logger.error('Failed to persist metric event', { error, payload });
    }
  }
}
