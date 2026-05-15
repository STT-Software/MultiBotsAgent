/**
 * Servicio de solicitud de restablecimiento de contraseña (Forgot Password).
 *
 * Orquesta el flujo completo de solicitud de reset:
 * 1. Normalizar email (trim + toLowerCase)
 * 2. Verificar rate limit por email (máx 3 por hora). Si excede, retornar silenciosamente.
 * 3. Buscar usuario por email. Si no existe, retornar silenciosamente.
 * 4. Invalidar tokens previos de tipo `password_reset` del usuario.
 * 5. Generar token con crypto.randomBytes(32).toString('hex')
 * 6. Crear documento en verifyTokens con type `password_reset`, expiresAt = now + 1 hora
 * 7. Encolar email con template y payload { resetLink }
 *
 * Seguridad: siempre retorna void sin revelar si el email existe o no.
 * Usa inyección de dependencias via constructor para facilitar testing.
 * Este módulo es lógica pura sin dependencias de AWS ni framework.
 */
import crypto from 'node:crypto';

// ─── Repository Interfaces ───────────────────────────────────────────────────

/** Interfaz del repositorio de usuario para forgot-password. */
export interface IForgotPasswordUserRepository {
  /** Busca un usuario por email. Retorna null si no existe. */
  findByEmail(email: string): Promise<{ id: string; email: string } | null>;
}

/** Interfaz del repositorio de tokens de verificación para forgot-password. */
export interface IForgotPasswordTokenRepository {
  /** Invalida todos los tokens de un usuario por tipo (marca como usados). */
  invalidateByUserAndType(userId: string, type: string): Promise<void>;
  /** Crea un nuevo token de verificación/reset. */
  create(data: { userId: string; type: string; token: string; expiresAt: Date }): Promise<void>;
}

/** Interfaz del repositorio de cola de emails para forgot-password. */
export interface IForgotPasswordEmailRepository {
  /** Encola un email para envío. */
  enqueue(data: { to: string; template: string; payload: Record<string, string> }): Promise<void>;
}

// ─── Rate Limit Interface ────────────────────────────────────────────────────

/** Interfaz del servicio de rate limiting para forgot-password. */
export interface IForgotPasswordRateLimitService {
  /** Verifica si una clave está rate-limited. */
  isRateLimited(key: string, maxAttempts: number, windowMs: number): Promise<boolean>;
  /** Incrementa el contador de intentos para una clave. */
  increment(key: string, windowMs: number): Promise<void>;
}

// ─── Dependencies Interface ──────────────────────────────────────────────────

/** Dependencias inyectables del servicio de forgot-password. */
export interface ForgotPasswordDeps {
  userRepository: IForgotPasswordUserRepository;
  verifyTokenRepository: IForgotPasswordTokenRepository;
  emailQueueRepository: IForgotPasswordEmailRepository;
  rateLimitService: IForgotPasswordRateLimitService;
  frontendUrl: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ForgotPasswordService {
  private readonly deps: ForgotPasswordDeps;

  constructor(deps: ForgotPasswordDeps) {
    this.deps = deps;
  }

  /**
   * Procesa la solicitud de restablecimiento de contraseña.
   * Siempre retorna void — no revela si el email existe o no (seguridad por oscuridad).
   * Todos los errores se capturan silenciosamente para no revelar información al caller.
   *
   * @param email - Email proporcionado por el usuario
   */
  async execute(email: string): Promise<void> {
    try {
      // 1. Normalizar email (trim + toLowerCase)
      const normalizedEmail = email.trim().toLowerCase();

      // 2. Verificar rate limit con clave `forgot-pwd:<email>` (máx 3 por hora = 3600000ms)
      const rateLimitKey = `forgot-pwd:${normalizedEmail}`;
      const isLimited = await this.deps.rateLimitService.isRateLimited(rateLimitKey, 3, 3_600_000);
      if (isLimited) {
        return;
      }

      // 3. Incrementar el rate limit counter
      await this.deps.rateLimitService.increment(rateLimitKey, 3_600_000);

      // 4. Buscar usuario por email. Si no existe, retornar silenciosamente
      const user = await this.deps.userRepository.findByEmail(normalizedEmail);
      if (!user) {
        return;
      }

      // 5. Invalidar tokens previos de tipo `password_reset` del usuario
      await this.deps.verifyTokenRepository.invalidateByUserAndType(user.id, 'password_reset');

      // 6. Generar token con crypto.randomBytes(32).toString('hex')
      const token = crypto.randomBytes(32).toString('hex');

      // 7. Crear documento en verifyTokens con type `password_reset`, expiresAt = now + 1 hora (3600000ms)
      const expiresAt = new Date(Date.now() + 3_600_000);
      await this.deps.verifyTokenRepository.create({
        userId: user.id,
        type: 'password_reset',
        token,
        expiresAt,
      });

      // 8. Encolar email con template `password_reset` y payload con resetLink y username
      const resetLink = `${this.deps.frontendUrl}/reset-password?token=${token}`;
      const username = normalizedEmail.split('@')[0] || normalizedEmail;
      await this.deps.emailQueueRepository.enqueue({
        to: normalizedEmail,
        template: 'password_reset',
        payload: { resetLink, username },
      });
    } catch {
      // Silenciar todos los errores — seguridad por oscuridad.
      // No revelar ningún error al caller.
      return;
    }
  }
}
