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
}
