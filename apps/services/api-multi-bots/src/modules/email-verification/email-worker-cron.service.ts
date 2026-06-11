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
   * Supports multiple templates: verification, password recovery, and direct HTML bodies.
   */
  private async sendEmail(item: EmailQueueItem): Promise<void> {
    if (!this.apiKey) {
      throw new Error('ELASTIC_EMAIL_API_KEY is not configured');
    }

    const payload = item.payload as Record<string, unknown>;
    const { subject, templateName, merge, htmlBody } = this.resolveTemplate(item.template, payload);

    const contentPayload: Record<string, any> = {
      From: `${this.fromName} <${this.fromEmail}>`,
      Subject: subject,
    };

    if (htmlBody) {
      contentPayload.Body = [
        {
          ContentType: 'HTML',
          Content: htmlBody,
        },
      ];
    } else {
      contentPayload.TemplateName = templateName;
      contentPayload.Merge = merge;
    }

    const body = {
      Recipients: { To: [item.to] },
      Content: contentPayload,
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
  ): {
    subject: string;
    templateName?: string;
    merge?: Record<string, string>;
    htmlBody?: string;
  } {
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

        const htmlBody = this.getHtmlEmailTemplate(
          'Alerta de Escalamiento a Humano',
          `Hola <strong>${username}</strong>, se ha derivado una conversación activa que requiere tu atención inmediata.`,
          [
            { label: 'Asistente', value: agentName },
            { label: 'ID Conversación', value: conversationId },
            { label: 'Motivo', value: reason || 'Solicitud de asesor humano' }
          ],
          url ? { label: 'Atender Conversación', url } : undefined
        );

        return {
          subject: 'Alerta de Escalamiento - MultiBotAgents',
          htmlBody,
        };
      }

      case 'new_booking_alert': {
        const customerName = payload.customerName as string || '';
        const dateTimeVal = payload.dateTime as string || '';
        const agentName = payload.agentName as string || 'Agente';
        const url = payload.url as string || '';

        const formattedDate = dateTimeVal ? new Date(dateTimeVal).toLocaleString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : '';

        const htmlBody = this.getHtmlEmailTemplate(
          'Nueva Reserva Recibida',
          `Hola <strong>${username}</strong>, tu asistente ha coordinado una nueva reserva en tu calendario.`,
          [
            { label: 'Cliente', value: customerName },
            { label: 'Fecha y Hora', value: formattedDate },
            { label: 'Asistente', value: agentName }
          ],
          url ? { label: 'Ver Reservas', url } : undefined
        );

        return {
          subject: 'Nueva Reserva Recibida - MultiBotAgents',
          htmlBody,
        };
      }

      case 'booking_confirmed': {
        const customerName = payload.customerName as string || '';
        const dateTimeVal = payload.dateTime as string || '';
        const agentName = payload.agentName as string || 'Agente';

        const formattedDate = dateTimeVal ? new Date(dateTimeVal).toLocaleString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : '';

        const htmlBody = this.getHtmlEmailTemplate(
          '¡Tu Cita está Confirmada!',
          `Hola <strong>${customerName}</strong>, te confirmamos que tu cita ha sido agendada con éxito.`,
          [
            { label: 'Servicio / Asistente', value: agentName },
            { label: 'Fecha y Hora', value: formattedDate },
            { label: 'Estado', value: 'Confirmada' }
          ]
        );

        return {
          subject: 'Confirmación de tu Cita - MultiBotAgents',
          htmlBody,
        };
      }

      case 'booking_rescheduled': {
        const customerName = payload.customerName as string || '';
        const dateTimeVal = payload.dateTime as string || '';
        const agentName = payload.agentName as string || 'Agente';

        const formattedDate = dateTimeVal ? new Date(dateTimeVal).toLocaleString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : '';

        const htmlBody = this.getHtmlEmailTemplate(
          'Tu Cita ha sido Reprogramada',
          `Hola <strong>${customerName}</strong>, te informamos que tu cita ha sido reprogramada con un nuevo horario.`,
          [
            { label: 'Servicio / Asistente', value: agentName },
            { label: 'Nueva Fecha y Hora', value: formattedDate },
            { label: 'Estado', value: 'Reprogramada' }
          ]
        );

        return {
          subject: 'Reprogramación de tu Cita - MultiBotAgents',
          htmlBody,
        };
      }

      case 'booking_cancelled': {
        const customerName = payload.customerName as string || '';
        const dateTimeVal = payload.dateTime as string || '';
        const agentName = payload.agentName as string || 'Agente';

        const formattedDate = dateTimeVal ? new Date(dateTimeVal).toLocaleString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : '';

        const htmlBody = this.getHtmlEmailTemplate(
          'Tu Cita ha sido Cancelada',
          `Hola <strong>${customerName}</strong>, te informamos que tu cita con nosotros ha sido cancelada.`,
          [
            { label: 'Servicio / Asistente', value: agentName },
            { label: 'Fecha y Hora Original', value: formattedDate },
            { label: 'Estado', value: 'Cancelada' }
          ]
        );

        return {
          subject: 'Cancelación de tu Cita - MultiBotAgents',
          htmlBody,
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

  /**
   * Generates a responsive, modern HTML template for notifications.
   */
  private getHtmlEmailTemplate(
    title: string,
    message: string,
    details: { label: string; value: string }[],
    button?: { label: string; url: string }
  ): string {
    const detailsHtml = details.map(d => `
      <tr style="border-bottom: 1px solid rgba(60, 74, 65, 0.3);">
        <td style="padding: 10px 0; font-size: 13px; color: #869489; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${d.label}</td>
        <td style="padding: 10px 0; font-size: 14px; color: #dde5dc; text-align: right; font-weight: 600;">${d.value}</td>
      </tr>
    `).join('');

    const buttonHtml = button ? `
      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${button.url}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #00bb7a; color: #004329; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 187, 122, 0.25); transition: all 0.2s ease-in-out;">
          ${button.label}
        </a>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0c100e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 40px 10px;">
              <!-- Tarjeta principal -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #121814; border: 1px solid #2f3731; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
                <!-- Header con branding -->
                <tr>
                  <td align="center" style="padding: 30px 30px 20px 30px; border-bottom: 1px solid rgba(60, 74, 65, 0.4);">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                      MultiBot<span style="color: #00bb7a;">Agents</span>
                    </h2>
                  </td>
                </tr>
                <!-- Contenido -->
                <tr>
                  <td style="padding: 30px 30px 20px 30px;">
                    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #dde5dc; text-align: center;">
                      ${title}
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #bbcabe; text-align: center;">
                      ${message}
                    </p>
                    
                    <!-- Ficha de detalles -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
                      ${detailsHtml}
                    </table>

                    ${buttonHtml}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 20px 30px 30px 30px; border-top: 1px solid rgba(60, 74, 65, 0.3); background-color: #0d120f;">
                    <p style="margin: 0; font-size: 11px; color: #5a6b5e; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                      © 2026 MultiBotAgents
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #5a6b5e;">
                      Notificaciones automáticas del sistema. Por favor no respondas a este correo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private calculateNextRetry(attempts: number): Date | null {
    const delays = [60_000, 300_000, 900_000];
    if (attempts >= 3) return null;
    return new Date(Date.now() + (delays[attempts - 1] ?? delays[delays.length - 1]));
  }
}
