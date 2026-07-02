import { EmailTemplate } from "@multibotagents/types";
import type { INotificationsWsEmitter } from "./ports/notifications-ws-emitter.interface";

export interface IEmailQueueRepository {
  enqueue(item: {
    to: string;
    template: EmailTemplate;
    payload: Record<string, unknown>;
  }): Promise<{ id: string }>;
}

export interface IUserRepository {
  findOperatorsByCompany(companyId: string): Promise<Array<{ email: string }>>;
}

export interface NotificarEscalamientoParams {
  companyId: string;
  conversationId: string;
  agentName: string;
  reason: string;
}

export interface NotificationServiceDeps {
  emailQueueRepository: IEmailQueueRepository;
  userRepository: IUserRepository;
  wsEmitter: INotificationsWsEmitter;
  frontendDomain: string;
}

/**
 * Servicio de dominio puro para la gestión de notificaciones.
 * Lógica pura sin dependencias de AWS ni de NestJS.
 */
export class NotificationService {
  private readonly emailQueueRepository: IEmailQueueRepository;
  private readonly userRepository: IUserRepository;
  private readonly wsEmitter: INotificationsWsEmitter;
  private readonly frontendDomain: string;

  constructor(deps: NotificationServiceDeps) {
    this.emailQueueRepository = deps.emailQueueRepository;
    this.userRepository = deps.userRepository;
    this.wsEmitter = deps.wsEmitter;
    this.frontendDomain = deps.frontendDomain;
  }

  /**
   * Notifica a la empresa que una conversación ha sido escalada a humano.
   * Envía una alerta por WebSocket en tiempo real y encola correos de alerta para los operadores.
   */
  async notificarEscalamiento(params: NotificarEscalamientoParams): Promise<void> {
    const { companyId, conversationId, agentName, reason } = params;

    // 1. Emitir alerta en tiempo real al panel web
    const wsPayload = {
      conversationId,
      agentName,
      reason,
      timestamp: new Date().toISOString(),
    };
    this.wsEmitter.emitirAlerta(companyId, "notification.new", wsPayload);

    // 2. Obtener operadores de la empresa para enviar correo
    try {
      const operators = await this.userRepository.findOperatorsByCompany(companyId);
      const url = `${this.frontendDomain}/inbox?conversationId=${conversationId}`;

      for (const op of operators) {
        await this.emailQueueRepository.enqueue({
          to: op.email,
          template: EmailTemplate.ESCALATION_ALERT,
          payload: {
            username: op.email.split("@")[0] || "Operador",
            conversationId,
            agentName,
            reason,
            url,
          },
        });
      }
    } catch (error) {
      // Degradación silenciosa para no interrumpir el flujo del RAG si falla la búsqueda de usuarios o encolado
      console.error("[NotificationService] Fallo al encolar correos de escalamiento:", error);
    }
  }

  /**
   * Notifica a la empresa sobre una nueva reserva realizada.
   * Envía una alerta por WebSocket y encola correos para los operadores.
   */
  async notificarNuevoBooking(params: NotificarNuevoBookingParams): Promise<void> {
    const { companyId, bookingId, customerName, dateTime, agentName } = params;

    if (isNaN(dateTime.getTime())) {
      console.error("[NotificationService] Intento de notificarNuevoBooking con fecha inválida");
      return;
    }

    // 1. Emitir alerta por WebSocket
    const wsPayload = {
      type: "booking",
      bookingId,
      customerName,
      dateTime: dateTime.toISOString(),
      agentName,
      timestamp: new Date().toISOString(),
    };
    this.wsEmitter.emitirAlerta(companyId, "notification.new", wsPayload);

    // 2. Encolar correos para los operadores
    try {
      const operators = await this.userRepository.findOperatorsByCompany(companyId);
      const url = `${this.frontendDomain}/pedidos`;

      for (const op of operators) {
        await this.emailQueueRepository.enqueue({
          to: op.email,
          template: EmailTemplate.NEW_BOOKING_ALERT,
          payload: {
            username: op.email.split("@")[0] || "Operador",
            bookingId,
            customerName,
            dateTime: dateTime.toISOString(),
            agentName,
            url,
          },
        });
      }
    } catch (error) {
      console.error("[NotificationService] Fallo al encolar correos de alerta de reserva:", error);
    }
  }

  /**
   * Notifica al cliente sobre el estado de su reserva (confirmación, reprogramación o cancelación).
   * Encola el correo correspondiente en la cola de correos.
   */
  async notificarClienteBooking(params: NotificarClienteBookingParams): Promise<void> {
    const { template, customerEmail, customerName, dateTime, agentName } = params;

    if (!customerEmail) return; // Si no hay email, no encolar

    if (isNaN(dateTime.getTime())) {
      console.error("[NotificationService] Intento de notificarClienteBooking con fecha inválida");
      return;
    }

    try {
      await this.emailQueueRepository.enqueue({
        to: customerEmail,
        template,
        payload: {
          username: customerName,
          customerName,
          dateTime: dateTime.toISOString(),
          agentName,
        },
      });
    } catch (error) {
      console.error("[NotificationService] Fallo al encolar correo para el cliente sobre su reserva:", error);
    }
  }
}

export interface NotificarNuevoBookingParams {
  companyId: string;
  bookingId: string;
  customerName: string;
  dateTime: Date;
  agentName: string;
}

export interface NotificarClienteBookingParams {
  template: EmailTemplate; // booking_confirmed | booking_rescheduled | booking_cancelled
  customerEmail: string;
  customerName: string;
  dateTime: Date;
  agentName: string;
}

