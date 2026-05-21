/**
 * EmailWorkerService — Servicio de procesamiento de cola de emails.
 *
 * Procesa documentos pendientes/retry de la cola de emails, envía mediante
 * Elastic Email y actualiza estados. Incluye backoff exponencial, métricas
 * y recovery de documentos stuck.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 9.5, 9.6, 9.7, 10.1, 10.2
 */
import type { EmailQueueItem } from '@multibotagents/types';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

interface SendEmailParams {
  to: string;
  templateId: string;
  mergeFields: Record<string, string>;
  from: { email: string; name: string };
  subject?: string;
}

interface IEmailSender {
  send(params: SendEmailParams): Promise<void>;
}

export interface IEmailWorkerQueueRepository {
  enqueue(item: { to: string; template: string; payload: Record<string, unknown> }): Promise<{ id: string }>;
  findEligible(limit: number): Promise<EmailQueueItem[]>;
  takeForProcessing(id: string, currentStatus: string): Promise<EmailQueueItem | null>;
  markSent(id: string): Promise<void>;
  markFailed(id: string, error: string, nextRetryAt: Date | null, attempts: number): Promise<void>;
  countByStatus(status: string): Promise<number>;
  avgQueueTime(): Promise<number>;
  resetStuckDocuments(timeoutMs: number): Promise<void>;
}

// ─── Config & Results ────────────────────────────────────────────────────────

export interface EmailWorkerConfig {
  /** Máximo de documentos por invocación. */
  batchSize: number;
  /** Backoff exponencial: delays en ms por intento [60000, 300000, 900000]. */
  retryDelays: number[];
  /** Máximo de reintentos. */
  maxRetries: number;
  /** Dominio del frontend para construir URLs de verificación. */
  frontendDomain: string;
  /** Timeout en ms para considerar un documento stuck (default: 5 * 60 * 1000). */
  stuckTimeoutMs: number;
  /** Email del remitente. */
  fromEmail: string;
  /** Nombre del remitente. */
  fromName: string;
}

export interface EmailWorkerServiceDeps {
  emailQueueRepository: IEmailWorkerQueueRepository;
  emailSender: IEmailSender;
  logger: Logger;
  config: EmailWorkerConfig;
}

export interface WorkerResult {
  processed: number;
  sent: number;
  failed: number;
  pendingCount: number;
  failedCount: number;
  avgQueueTimeMs: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Longitud máxima permitida para la URL de verificación. */
const MAX_URL_LENGTH = 2048;

// ─── Service ─────────────────────────────────────────────────────────────────

export class EmailWorkerService {
  private readonly emailQueueRepository: IEmailWorkerQueueRepository;
  private readonly emailSender: IEmailSender;
  private readonly logger: Logger;
  private readonly config: EmailWorkerConfig;

  constructor(deps: EmailWorkerServiceDeps) {
    this.emailQueueRepository = deps.emailQueueRepository;
    this.emailSender = deps.emailSender;
    this.logger = deps.logger;
    this.config = deps.config;
  }

  /**
   * Procesa la cola de emails: resetea documentos stuck, toma documentos
   * pendientes/retry, los envía y actualiza su estado.
   *
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7
   */
  async processQueue(): Promise<WorkerResult> {
    let processed = 0;
    let sent = 0;
    let failed = 0;

    // 1. Resetear documentos stuck (processing > stuckTimeoutMs)
    await this.emailQueueRepository.resetStuckDocuments(this.config.stuckTimeoutMs);

    // 2. Buscar documentos elegibles (max batchSize)
    const eligible = await this.emailQueueRepository.findEligible(this.config.batchSize);

    // 3. Procesar cada documento
    for (const item of eligible) {
      // 3.1 Lock atómico via takeForProcessing
      const locked = await this.emailQueueRepository.takeForProcessing(item.id, item.status);

      if (!locked) {
        // Otra instancia ya tomó este documento, skip
        continue;
      }

      processed++;

      try {
        // 3.2 Construir merge fields
        const mergeFields = this.buildMergeFields(locked);

        // 3.3 Validar longitud de URL
        const verificationUrl = mergeFields.verification_url;
        if (verificationUrl && verificationUrl.length > MAX_URL_LENGTH) {
          const errorMsg = `Verification URL exceeds maximum length of ${MAX_URL_LENGTH} characters (actual: ${verificationUrl.length})`;
          await this.emailQueueRepository.markFailed(
            locked.id,
            errorMsg,
            null,
            locked.attempts + 1,
          );
          failed++;
          this.logger.error('URL length exceeded', { id: locked.id, urlLength: verificationUrl.length });
          continue;
        }

        // 3.4 Enviar email
        await this.emailSender.send({
          to: locked.to,
          templateId: locked.template,
          mergeFields,
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName,
          },
          subject: 'Verifica tu email - MultiBotAgents',
        });

        // 3.5 Marcar como enviado
        await this.emailQueueRepository.markSent(locked.id);
        sent++;

        this.logger.info('Email sent successfully', { id: locked.id, to: locked.to });
      } catch (error) {
        // 3.6 Error en envío: calcular backoff y marcar como fallido
        const attempts = locked.attempts + 1;
        const nextRetryAt = this.calculateNextRetry(attempts);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await this.emailQueueRepository.markFailed(
          locked.id,
          errorMessage,
          nextRetryAt,
          attempts,
        );
        failed++;

        this.logger.error('Email send failed', {
          id: locked.id,
          to: locked.to,
          attempts,
          error: errorMessage,
          nextRetryAt: nextRetryAt?.toISOString() ?? null,
        });
      }
    }

    // 4. Calcular métricas
    const pendingCount = await this.emailQueueRepository.countByStatus('pending');
    const failedCount = await this.emailQueueRepository.countByStatus('failed');
    const avgQueueTimeMs = await this.emailQueueRepository.avgQueueTime();

    this.logger.info('Queue processing complete', {
      processed,
      sent,
      failed,
      pendingCount,
      failedCount,
      avgQueueTimeMs,
    });

    return {
      processed,
      sent,
      failed,
      pendingCount,
      failedCount,
      avgQueueTimeMs,
    };
  }

  /**
   * Calcula la fecha del próximo reintento basado en backoff exponencial.
   *
   * - attempt 1 → now + 60000ms (1 min)
   * - attempt 2 → now + 300000ms (5 min)
   * - attempt 3 → now + 900000ms (15 min)
   * - attempt >= maxRetries → null (sin más reintentos)
   *
   * Validates: Requirements 3.4, 3.5
   */
  calculateNextRetry(attempts: number): Date | null {
    if (attempts >= this.config.maxRetries) {
      return null;
    }

    const delayIndex = attempts - 1;
    const delay = this.config.retryDelays[delayIndex] ?? this.config.retryDelays[this.config.retryDelays.length - 1];

    return new Date(Date.now() + delay);
  }

  /**
   * Construye los merge fields para el envío del email.
   * Usa fallback "Usuario" si no hay nombre de usuario en el payload.
   * Construye la URL de verificación con formato {dominio}/verify-email?token={token}.
   *
   * Validates: Requirements 9.5, 9.6, 10.2
   */
  buildMergeFields(item: EmailQueueItem): Record<string, string> {
    const payload = item.payload as Record<string, unknown>;

    // Username: usar payload.username o fallback "Usuario"
    const username = (payload.username as string) || 'Usuario';

    // URL de verificación: construir desde token del payload
    const token = payload.token as string;
    const verificationUrl = `${this.config.frontendDomain}/verify-email?token=${token}`;

    return {
      username,
      verification_url: verificationUrl,
    };
  }
}
