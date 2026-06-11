/**
 * Interfaz INotificationsWsEmitter.
 *
 * Define el puerto para emitir eventos de notificación en tiempo real.
 * Implementado por adaptadores en la capa de infraestructura (NestJS Gateway).
 */
export interface INotificationsWsEmitter {
  /**
   * Emite una alerta en tiempo real a todos los clientes conectados de una empresa.
   *
   * @param companyId - ID de la empresa destinataria.
   * @param event - Nombre del evento.
   * @param payload - Datos asociados a la notificación.
   */
  emitirAlerta(companyId: string, event: string, payload: unknown): void;
}
