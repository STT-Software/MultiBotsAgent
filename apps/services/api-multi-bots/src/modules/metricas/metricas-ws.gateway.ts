import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from './guards/ws-jwt.guard';

/**
 * Gateway WebSocket del módulo de métricas.
 * Namespace: /metricas
 *
 * Responsabilidades actuales (SL12 — Slice base):
 * - Autenticar conexiones vía WsJwtGuard (token JWT en query param)
 * - Unir clientes autenticados al room de su empresa: company:<companyId>
 * - Exponer emitToCompany() para uso en slices futuros (Slice 4 — Visualización)
 *
 * El envío real de eventos en vivo se implementa en el Slice 4.
 * Aquí solo se establece la infraestructura segura de conexión.
 *
 * Uso del cliente:
 *   const socket = io('ws://host/metricas', { query: { token: '<jwt>' } });
 *   socket.emit('subscribe'); // → se une al room company:<companyId>
 */
@UseGuards(WsJwtGuard)
@WebSocketGateway({ namespace: '/metricas', cors: { origin: '*' } })
export class MetricasWsGateway {
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
    }
  }

  /**
   * Emite un evento a todos los sockets de una empresa.
   * Preparado para uso en Slice 4 (Visualización en tiempo real).
   *
   * @param companyId - ID de la empresa destinataria
   * @param event - Nombre del evento Socket.io (ej: "metrics.live_update")
   * @param payload - Datos del evento
   */
  emitToCompany(companyId: string, event: string, payload: unknown): void {
    this.server.to(`company:${companyId}`).emit(event, payload);
  }
}
