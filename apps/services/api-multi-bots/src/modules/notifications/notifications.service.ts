import { Injectable, Inject, Logger } from '@nestjs/common';
import { NotificationService } from '@multibotagents/core';
import type { EmailQueueRepository, UserRepository } from '@multibotagents/db';
import { NotificationsWsEmitterProvider } from './providers/notifications-ws-emitter.provider';

/**
 * Adaptador de servicio en NestJS para la gestión de notificaciones.
 * Instancia y expone el NotificationService del core.
 */
@Injectable()
export class NotificationsService {
  private readonly coreService: NotificationService;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject('EMAIL_QUEUE_REPO')
    private readonly emailQueueRepo: EmailQueueRepository,
    @Inject('USER_REPO')
    private readonly userRepo: UserRepository,
    private readonly wsEmitter: NotificationsWsEmitterProvider,
  ) {
    const frontendDomain = process.env.FRONTEND_DOMAIN || 'http://localhost:3000';
    this.coreService = new NotificationService({
      emailQueueRepository: this.emailQueueRepo,
      userRepository: this.userRepo,
      wsEmitter: this.wsEmitter,
      frontendDomain,
    });
    this.logger.log('NotificationsService initialized with core service');
  }

  /**
   * Envía una notificación de escalamiento a los operadores (WebSocket + Email).
   */
  async notificarEscalamiento(params: {
    companyId: string;
    conversationId: string;
    agentName: string;
    reason: string;
  }): Promise<void> {
    this.logger.log(`Notificando escalamiento para conversación: ${params.conversationId}`);
    return this.coreService.notificarEscalamiento(params);
  }
}
