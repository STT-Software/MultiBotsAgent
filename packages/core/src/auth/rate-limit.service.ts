/**
 * Servicio de rate limiting para autenticación.
 *
 * Controla la frecuencia de intentos de login fallidos por IP y por email.
 * Usa contadores con ventana temporal almacenados en MongoDB.
 *
 * Reglas:
 * - IP: máximo 5 intentos en 1 minuto → bloqueo 5 minutos
 * - Email: máximo 10 intentos en 10 minutos → bloqueo 15 minutos
 * - Ambas reglas se evalúan independientemente (OR)
 *
 * Este módulo es lógica pura sin dependencias de AWS ni framework.
 */
import type { IRateLimitRepository, RateLimitConfig } from '@multibotagents/types';
import { RateLimitExceededError } from '@multibotagents/types';

// ─── Default Configuration ───────────────────────────────────────────────────

const DEFAULT_CONFIG: RateLimitConfig = {
  ipMaxAttempts: 5,
  ipWindowMs: 60_000, // 1 minuto
  ipBlockDurationMs: 300_000, // 5 minutos
  emailMaxAttempts: 10,
  emailWindowMs: 600_000, // 10 minutos
  emailBlockDurationMs: 900_000, // 15 minutos
};

// ─── Key Helpers ─────────────────────────────────────────────────────────────

/** Genera la clave de rate limit para una IP. */
export function ipKey(ip: string): string {
  return `ip:${ip}`;
}

/** Genera la clave de rate limit para un email. */
export function emailKey(email: string): string {
  return `email:${email}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class RateLimitService {
  private readonly repo: IRateLimitRepository;
  private readonly config: RateLimitConfig;

  constructor(repo: IRateLimitRepository, config?: Partial<RateLimitConfig>) {
    this.repo = repo;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Verifica si una IP o email está bloqueado por rate limiting.
   * Evalúa ambas reglas independientemente: si cualquiera está bloqueada, rechaza.
   *
   * @param ip - Dirección IP del request
   * @param email - Email del intento de login
   * @throws {RateLimitExceededError} Si la IP o el email están bloqueados
   */
  async checkRateLimit(ip: string, email: string): Promise<void> {
    const [ipRecord, emailRecord] = await Promise.all([
      this.repo.findByKey(ipKey(ip)),
      this.repo.findByKey(emailKey(email)),
    ]);

    const now = new Date();

    // Check IP block
    if (ipRecord?.blockedUntil && ipRecord.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil(
        (ipRecord.blockedUntil.getTime() - now.getTime()) / 1000,
      );
      throw new RateLimitExceededError(retryAfterSeconds);
    }

    // Check email block
    if (emailRecord?.blockedUntil && emailRecord.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil(
        (emailRecord.blockedUntil.getTime() - now.getTime()) / 1000,
      );
      throw new RateLimitExceededError(retryAfterSeconds);
    }
  }

  /**
   * Registra un intento fallido de login para IP y email.
   * Incrementa contadores y establece bloqueo si se alcanza el umbral.
   *
   * @param ip - Dirección IP del request
   * @param email - Email del intento de login
   */
  async recordFailedAttempt(ip: string, email: string): Promise<void> {
    await Promise.all([
      this.repo.upsertAttempt(
        ipKey(ip),
        this.config.ipWindowMs,
        this.config.ipBlockDurationMs,
        this.config.ipMaxAttempts,
      ),
      this.repo.upsertAttempt(
        emailKey(email),
        this.config.emailWindowMs,
        this.config.emailBlockDurationMs,
        this.config.emailMaxAttempts,
      ),
    ]);
  }

  /**
   * Resetea el contador de intentos fallidos para un email.
   * Se llama tras un login exitoso.
   *
   * @param email - Email cuyo contador se resetea
   */
  async resetAttempts(email: string): Promise<void> {
    await this.repo.resetByKey(emailKey(email));
  }
}
