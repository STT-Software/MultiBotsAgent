import { Injectable } from '@nestjs/common';
import type { INotificationsWsEmitter } from '@multibotagents/core';
import { NotificationsWsGateway } from '../notifications-ws.gateway';

/**
 * Adaptador que conecta el NotificationsWsGateway (infraestructura NestJS)
 * con la interfaz de puerto INotificationsWsEmitter del core de negocio.
 */
@Injectable()
export class NotificationsWsEmitterProvider implements INotificationsWsEmitter {
  constructor(private readonly gateway: NotificationsWsGateway) {}

  /**
   * Emite una alerta a los clientes conectados a través del gateway.
   */
  emitirAlerta(companyId: string, event: string, payload: unknown): void {
    this.gateway.emitirAlerta(companyId, event, payload);
  }
}
