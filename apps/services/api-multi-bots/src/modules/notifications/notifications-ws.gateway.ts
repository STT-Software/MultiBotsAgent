import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../metricas/guards/ws-jwt.guard';

/**
 * Gateway WebSocket para el módulo de notificaciones.
 * Namespace: /notifications
 *
 * Responsabilidades:
 * - Autenticar conexiones vía WsJwtGuard (token JWT en query param)
 * - Unir clientes autenticados al room de su empresa: company:<companyId>
 * - Emitir alertas de notificaciones en tiempo real al panel web.
 */
@UseGuards(WsJwtGuard)
@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationsWsGateway {
  private readonly logger = new Logger(NotificationsWsGateway.name);

  @WebSocketServer()
  server!: Server;

  /**
   * Une al cliente autenticado al room de su empresa.
   * El companyId se extrae del payload JWT adjuntado por WsJwtGuard.
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket): void {
    const companyId: string = client.data.user?.companyId;
    if (companyId) {
      client.join(`company:${companyId}`);
      this.logger.log(`Cliente WebSocket suscrito al canal de la empresa: company:${companyId}`);
    }
  }

  /**
   * Emite una alerta a todos los sockets de una empresa en particular.
   *
   * @param companyId - ID de la empresa destinataria
   * @param event - Nombre del evento Socket.io (ej: "notification.new")
   * @param payload - Datos del evento
   */
  emitirAlerta(companyId: string, event: string, payload: unknown): void {
    this.server.to(`company:${companyId}`).emit(event, payload);
    this.logger.log(`Evento de notificación "${event}" emitido a la empresa company:${companyId}`);
  }
}
