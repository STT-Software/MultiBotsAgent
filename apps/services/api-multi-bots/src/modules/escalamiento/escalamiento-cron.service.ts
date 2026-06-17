import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ObjectId, Db } from 'mongodb';
import type {
  IEscalatedConversationRepository,
  IEscalationEventRepository,
} from '@multibotagents/db';
import {
  COMPANIES_COLLECTION,
  ESCALATED_CONVERSATIONS_COLLECTION,
} from '@multibotagents/db';
import type { MetricEventPayload } from '@multibotagents/types';

const DEFAULT_TIMEOUT_MINUTES = 60;

@Injectable()
export class EscalamientoCronService {
  private readonly logger = new Logger(EscalamientoCronService.name);

  constructor(
    @Inject('ESCALATED_CONVERSATION_REPO')
    private readonly conversationRepo: IEscalatedConversationRepository,
    @Inject('ESCALATION_EVENT_REPO')
    private readonly eventRepo: IEscalationEventRepository,
    @Inject('MONGO_DB')
    private readonly db: Db,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('EscalamientoCronService initialized');
  }

  @Cron('*/5 * * * *')
  async handleEscalationTimeout(): Promise<void> {
    this.logger.debug('Running escalation timeout check...');

    try {
      // Obtener companyIds distintos con conversaciones escaladas
      const escalatedCollection = this.db.collection(ESCALATED_CONVERSATIONS_COLLECTION);
      const companyIds = await escalatedCollection.distinct('companyId', { status: 'escalated' });

      if (companyIds.length === 0) {
        this.logger.debug('No companies with escalated conversations');
        return;
      }

      const companiesCollection = this.db.collection(COMPANIES_COLLECTION);

      let totalProcessed = 0;

      for (const companyId of companyIds) {
        const companyIdStr = companyId.toHexString();

        // Obtener timeout de la empresa
        const company = await companiesCollection.findOne({ _id: companyId });
        const timeoutMinutes = (company as any)?.escalationTimeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;

        // Buscar conversaciones que superan el timeout
        const timedOut = await this.conversationRepo.findTimedOut(companyIdStr, timeoutMinutes);

        for (const conversation of timedOut) {
          try {
            // TODO: Verificar si el agente está activo cuando el módulo de agentes esté implementado
            const agentAvailable = true;

            if (agentAvailable) {
              await this.conversationRepo.updateToActive(companyIdStr, conversation.id);
            } else {
              await this.conversationRepo.updateToUnassigned(companyIdStr, conversation.id);
            }

            // Agregar mensaje automático al historial
            await this.conversationRepo.addMessage(companyIdStr, conversation.id, {
              sender: 'agent',
              content: 'Tu conversación ha sido devuelta al asistente. Si necesitas más ayuda, no dudes en escribir.',
              timestamp: new Date(),
              type: 'text',
            });

            // Crear EscalationEvent
            const resolvedAt = new Date();
            const escalatedAt = new Date(conversation.escalatedAt);
            const durationMinutes = Math.round((resolvedAt.getTime() - escalatedAt.getTime()) / 60000);

            await this.eventRepo.create({
              conversationId: new ObjectId(conversation.id),
              companyId: new ObjectId(companyIdStr),
              agentId: conversation.agentId,
              agentName: conversation.agentName,
              escalationType: conversation.escalationType as "explicit" | "agent_detected",
              reason: conversation.reason,
              escalatedAt,
              resolvedAt,
              resolvedBy: 'system_timeout',
              durationMinutes,
              createdAt: resolvedAt,
            });

            // Emitir métrica de escalamiento por timeout (fire-and-forget)
            this.eventEmitter.emit('metric.event', {
              companyId: companyIdStr,
              agentId: conversation.agentId,
              agentType: conversation.agentType as 'rag' | 'cotizador' | 'agendamiento',
              eventType: 'escalation.timeout',
              timestamp: resolvedAt,
              metadata: { timeoutMinutes },
            } satisfies MetricEventPayload);

            totalProcessed++;
          } catch (err) {
            this.logger.error(
              `Error processing timed-out conversation ${conversation.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        if (timedOut.length > 0) {
          this.logger.log(`Processed ${timedOut.length} timed-out conversations for company ${companyIdStr}`);
        }
      }

      if (totalProcessed > 0) {
        this.logger.log(`Total auto-devolved conversations: ${totalProcessed}`);
      }
    } catch (err) {
      this.logger.error(`Error in escalation timeout cron: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
