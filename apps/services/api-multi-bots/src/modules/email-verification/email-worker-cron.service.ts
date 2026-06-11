import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { MongoClient } from 'mongodb';
import { EmailQueueRepository } from '@multibotagents/db';
import type { EmailQueueItem } from '@multibotagents/types';

/**
 * NestJS cron service que procesa la cola de emails cada 30 segundos.
 *
 * Implementación directa sin depender de EmailWorkerService de core.
 * Usa Elastic Email API v4 (POST /v4/emails/transactional con JSON).
 *
 * Validates: Requirements 3.1, 3.6, 8.2
 */
@Injectable()
export class EmailWorkerCronService {
  private readonly logger = new Logger(EmailWorkerCronService.name);
  private readonly emailQueueRepository: EmailQueueRepository;
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly templateId: string;
  private readonly frontendDomain: string;

  constructor(private readonly mongoClient: MongoClient) {
    const db = this.mongoClient.db();
    this.emailQueueRepository = new EmailQueueRepository(db);

    this.apiKey = process.env.ELASTIC_EMAIL_API_KEY ?? '';
    this.fromEmail = process.env.ELASTIC_EMAIL_FROM_EMAIL ?? '';
    this.fromName = process.env.ELASTIC_EMAIL_FROM_NAME ?? 'MultiBotAgents';
    this.templateId = process.env.ELASTIC_EMAIL_TEMPLATE_ID ?? '';
    this.frontendDomain = process.env.FRONTEND_DOMAIN ?? 'http://localhost:3000';
  }

  @Interval(10_000)
  async handleCron(): Promise<void> {
    try {
      // 1. Reset stuck documents (processing > 5 min)
      await this.emailQueueRepository.resetStuckDocuments(5 * 60 * 1000);

      // 2. Find eligible documents
      const eligible = await this.emailQueueRepository.findEligible(50);
      if (eligible.length === 0) return;

      let processed = 0;
      let sent = 0;
      let failed = 0;

      // 3. Process each document
      for (const item of eligible) {
        const locked = await this.emailQueueRepository.takeForProcessing(item.id, item.status);
        if (!locked) continue;

        processed++;

        try {
          await this.sendEmail(locked);
          await this.emailQueueRepository.markSent(locked.id);
          sent++;
          this.logger.log('Email sent successfully', { id: locked.id, to: locked.to });
        } catch (error) {
          const attempts = locked.attempts + 1;
          const nextRetryAt = this.calculateNextRetry(attempts);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          await this.emailQueueRepository.markFailed(locked.id, errorMessage, nextRetryAt, attempts);
          failed++;
          this.logger.error('Email send failed', { id: locked.id, to: locked.to, attempts, error: errorMessage });
        }
      }

      // 4. Metrics
      const pendingCount = await this.emailQueueRepository.countByStatus('pending');
      const failedCount = await this.emailQueueRepository.countByStatus('failed');
      const avgQueueTimeMs = await this.emailQueueRepository.avgQueueTime();

      this.logger.log('Email worker cycle completed', { processed, sent, failed, pendingCount, failedCount, avgQueueTimeMs });

      console.log(JSON.stringify({
        metricType: 'EMAIL_WORKER_METRICS',
        pendingCount, failedCount, avgQueueTimeMs, processed, sent, failed,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      this.logger.error('Email worker cycle failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Sends an email via Elastic Email API v4.
   * Supports multiple templates: verification and password recovery.
   */
  private async sendEmail(item: EmailQueueItem): Promise<void> {
    if (!this.apiKey) {
      throw new Error('ELASTIC_EMAIL_API_KEY is not configured');
    }

    const payload = item.payload as Record<string, unknown>;
    const { subject, templateName, merge } = this.resolveTemplate(item.template, payload);

    const body = {
      Recipients: { To: [item.to] },
      Content: {
        From: `${this.fromName} <${this.fromEmail}>`,
        Subject: subject,
        TemplateName: templateName,
        Merge: merge,
      },
    };

    const response = await fetch('https://api.elasticemail.com/v4/emails/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ElasticEmail-ApiKey': this.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unable to read response');
      throw new Error(`Elastic Email API error: HTTP ${response.status} - ${text}`);
    }

    const result = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (result && !result.TransactionID) {
      throw new Error(`Elastic Email unexpected response: ${JSON.stringify(result)}`);
    }
  }

  /**
   * Resolves template-specific subject, templateName, and merge variables
   * based on the email queue item's template field.
   */
  private resolveTemplate(
    template: string,
    payload: Record<string, unknown>,
  ): { subject: string; templateName: string; merge: Record<string, string> } {
    const username = (payload.username as string) || 'Usuario';

    switch (template) {
      case 'MultibotAgents-password-recover':
      case 'password_reset': {
        const resetLink = payload.resetLink as string;
        return {
          subject: 'Restablece tu contraseña - MultiBotAgents',
          templateName: process.env.ELASTIC_EMAIL_PASSWORD_RESET_TEMPLATE_ID || 'MultibotAgents-password-recover',
          merge: { username, resetLink: resetLink || '' },
        };
      }

      case 'escalation_alert': {
        const conversationId = payload.conversationId as string || '';
        const agentName = payload.agentName as string || 'Agente';
        const reason = payload.reason as string || '';
        const url = payload.url as string || '';
        return {
          subject: 'Alerta de Escalamiento - MultiBotAgents',
          templateName: process.env.ELASTIC_EMAIL_ESCALATION_TEMPLATE_ID || 'MultibotAgents-escalation-alert',
          merge: { username, conversationId, agentName, reason, url },
        };
      }

      case 'verification':
      default: {
        const token = payload.token as string;
        const verificationUrl = `${this.frontendDomain}/verify-email?token=${token}`;
        return {
          subject: 'Verifica tu email - MultiBotAgents',
          templateName: this.templateId,
          merge: { username, verification_url: verificationUrl },
        };
      }
    }
  }

  private calculateNextRetry(attempts: number): Date | null {
    const delays = [60_000, 300_000, 900_000];
    if (attempts >= 3) return null;
    return new Date(Date.now() + (delays[attempts - 1] ?? delays[delays.length - 1]));
  }
}
