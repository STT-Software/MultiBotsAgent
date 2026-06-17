/**
 * Tipos del sistema de métricas y analíticas.
 *
 * Contrato tipado para todos los emisores de eventos de métricas.
 * Cualquier módulo que emita un evento de métrica debe respetar
 * la interface MetricEventPayload y usar los valores de MetricEventType.
 */

/**
 * Todos los tipos de evento de negocio que pueden registrarse en el sistema de métricas.
 */
export type MetricEventType =
  | "conversation.completed"
  | "conversation.escalated"
  | "rag.no_answer"
  | "rag.topic_identified"
  | "order.initiated"
  | "order.confirmed"
  | "order.abandoned"
  | "appointment.scheduled"
  | "appointment.cancelled"
  | "appointment.rescheduled"
  | "escalation.opened"
  | "escalation.resolved"
  | "escalation.timeout";

/**
 * Contrato tipado para emitir un evento de métrica via EventEmitter.
 *
 * Uso:
 *   this.eventEmitter.emit("metric.event", {
 *     companyId,
 *     agentId,
 *     agentType: "rag",
 *     eventType: "escalation.opened",
 *     timestamp: new Date(),
 *     metadata: { reason: "usuario solicitó humano" },
 *   } satisfies MetricEventPayload);
 */
export interface MetricEventPayload {
  /** ID de la empresa propietaria del agente. Todas las métricas están aisladas por empresa. */
  companyId: string;

  /** ID del agente que originó el evento. */
  agentId: string;

  /** Tipo de agente que originó el evento. */
  agentType: "rag" | "cotizador" | "agendamiento";

  /** Tipo de evento de negocio ocurrido. */
  eventType: MetricEventType;

  /** Momento exacto en que ocurrió el evento (lo provee el emisor). */
  timestamp: Date;

  /** Datos adicionales específicos de cada tipo de evento. */
  metadata?: Record<string, unknown>;
}
