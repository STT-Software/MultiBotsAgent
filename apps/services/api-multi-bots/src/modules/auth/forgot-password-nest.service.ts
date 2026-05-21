import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ForgotPasswordService,
} from '@multibotagents/core';
import type {
  IForgotPasswordRateLimitService,
} from '@multibotagents/core';
import type {
  UserRepository,
  VerifyTokenRepository,
  EmailQueueRepository,
  RateLimitRepository,
} from '@multibotagents/db';

// ─── Rate Limit Adapter ──────────────────────────────────────────────────────

/**
 * Adaptador que envuelve RateLimitRepository para cumplir con la interfaz
 * IForgotPasswordRateLimitService requerida por el servicio de core.
 *
 * Implementa rate limiting silencioso: verifica si se excedió el máximo
 * de intentos en la ventana temporal sin bloquear explícitamente.
 */
class ForgotPasswordRateLimitAdapter implements IForgotPasswordRateLimitService {
  constructor(private readonly repo: RateLimitRepository) {}

  async isRateLimited(key: string, maxAttempts: number, _windowMs: number): Promise<boolean> {
    const record = await this.repo.findByKey(key);
    if (!record) return false;
    return record.attempts >= maxAttempts;
  }

  async increment(key: string, windowMs: number): Promise<void> {
    // Usamos upsertAttempt con un blockDuration alto y maxAttempts alto
    // para que solo incremente sin bloquear (el bloqueo lo maneja isRateLimited)
    await this.repo.upsertAttempt(key, windowMs, windowMs, 999);
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Servicio NestJS que envuelve la lógica de core para solicitud de
 * restablecimiento de contraseña (forgot password).
 *
 * Maneja la inyección de dependencias de NestJS y delega toda la
 * lógica de negocio al ForgotPasswordService de @multibotagents/core.
 */
@Injectable()
export class ForgotPasswordNestService {
  private readonly coreService: ForgotPasswordService;
  private readonly logger = new Logger(ForgotPasswordNestService.name);

  constructor(
    @Inject('USER_REPO') userRepository: UserRepository,
    @Inject('VERIFY_TOKEN_REPO') verifyTokenRepository: VerifyTokenRepository,
    @Inject('EMAIL_QUEUE_REPO') emailQueueRepository: EmailQueueRepository,
    @Inject('RATE_LIMIT_REPO') rateLimitRepository: RateLimitRepository,
  ) {
    const rateLimitAdapter = new ForgotPasswordRateLimitAdapter(rateLimitRepository);
    const frontendUrl = process.env.FRONTEND_DOMAIN || 'http://localhost:3000';

    this.coreService = new ForgotPasswordService({
      userRepository,
      verifyTokenRepository,
      emailQueueRepository,
      rateLimitService: rateLimitAdapter,
      frontendUrl,
    });

    this.logger.log('ForgotPasswordNestService initialized successfully');
  }

  /**
   * Ejecuta el flujo de solicitud de restablecimiento de contraseña.
   * Siempre retorna void — no revela si el email existe o no.
   *
   * @param email - Email proporcionado por el usuario (ya normalizado)
   */
  async execute(email: string): Promise<void> {
    await this.coreService.execute(email);
  }
}
