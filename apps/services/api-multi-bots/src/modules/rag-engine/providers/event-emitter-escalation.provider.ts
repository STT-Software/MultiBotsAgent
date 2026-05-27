import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

import type {
  EscalationEmitter,
  EscalationEvent,
} from '@multibotagents/types';

/**
 * Implementación de EscalationEmitter usando Node.js EventEmitter.
 * Publica eventos internos de escalamiento para que otros módulos
 * puedan suscribirse y gestionar la transferencia a humano.
 *
 * Valida: Requisitos 12.5, 12.6, 13.3
 */
@Injectable()
export class EventEmitterEscalationProvider implements EscalationEmitter {
  private readonly logger = new Logger(EventEmitterEscalationProvider.name);
  private readonly eventEmitter: EventEmitter;

  private static readonly EVENT_NAME = 'escalation.requested';

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(20);

    this.logger.log('EventEmitterEscalationProvider initialized');
  }

  /**
   * Emite un evento de escalamiento al sistema interno.
   * Retorna true si la emisión fue exitosa, false si falla.
   *
   * @param event - Evento de escalamiento con datos completos
   * @returns true si emisión exitosa, false si falla
   */
  async emit(event: EscalationEvent): Promise<boolean> {
    try {
      this.logger.debug('Emitting escalation event', {
        conversationId: event.conversationId,
        agentId: event.agentId,
        reason: event.reason,
      });

      this.eventEmitter.emit(
        EventEmitterEscalationProvider.EVENT_NAME,
        event,
      );

      this.logger.log('Escalation event emitted successfully', {
        conversationId: event.conversationId,
        agentId: event.agentId,
        companyId: event.companyId,
        reason: event.reason,
        timestamp: event.timestamp.toISOString(),
      });

      return true;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.logger.error('Failed to emit escalation event', {
        conversationId: event.conversationId,
        agentId: event.agentId,
        reason: event.reason,
        error: err.message,
        stack: err.stack,
      });

      return false;
    }
  }

  /**
   * Permite a otros módulos suscribirse a eventos de escalamiento.
   * Útil para integración con sistemas externos de atención al cliente.
   */
  onEscalation(listener: (event: EscalationEvent) => void): void {
    this.eventEmitter.on(
      EventEmitterEscalationProvider.EVENT_NAME,
      listener,
    );
  }

  /**
   * Remueve un listener de eventos de escalamiento.
   */
  offEscalation(listener: (event: EscalationEvent) => void): void {
    this.eventEmitter.off(
      EventEmitterEscalationProvider.EVENT_NAME,
      listener,
    );
  }
}
