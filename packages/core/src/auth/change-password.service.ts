/**
 * Servicio de cambio de contraseña.
 *
 * Orquesta el flujo completo de cambio de contraseña:
 * 1. Rate limit check por userId
 * 2. Buscar usuario por ID
 * 3. Verificar contraseña actual
 * 4. Sanitizar y validar nueva contraseña
 * 5. Verificar que la nueva contraseña sea diferente a la actual
 * 6. Hashear nueva contraseña (bcrypt, cost factor 12)
 * 7. Actualizar hash en BD
 * 8. Resetear contador de rate limit
 *
 * Usa inyección de dependencias via constructor para facilitar testing.
 * Este módulo es lógica pura sin dependencias de AWS ni framework.
 */
import type { IRateLimitRepository } from '@multibotagents/types';
import type {
  ChangePasswordDeps,
  IChangePasswordUserRepository,
} from './interfaces/change-password.interfaces';
import {
  InvalidCurrentPasswordError,
  SameAsCurrentError,
  PasswordValidationError,
  UserNotFoundError,
  RateLimitExceededError,
} from './interfaces/change-password.interfaces';
import type { PasswordService } from './password.service';
import { validatePassword, sanitizePasswordInput } from './password.validator';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Prefijo de clave de rate limit para cambio de contraseña. */
const RATE_LIMIT_KEY_PREFIX = 'change-pwd';

/** Máximo de intentos fallidos antes de bloqueo. */
const MAX_ATTEMPTS = 5;

/** Ventana de tiempo para rate limiting (15 minutos en ms). */
const WINDOW_MS = 900_000;

/** Duración del bloqueo (15 minutos en ms). */
const BLOCK_DURATION_MS = 900_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Genera la clave de rate limit para un userId. */
export function changePwdKey(userId: string): string {
  return `${RATE_LIMIT_KEY_PREFIX}:${userId}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ChangePasswordService {
  private readonly userRepository: IChangePasswordUserRepository;
  private readonly passwordService: PasswordService;
  private readonly rateLimitRepository: IRateLimitRepository;

  constructor(deps: ChangePasswordDeps) {
    this.userRepository = deps.userRepository;
    this.passwordService = deps.passwordService;
    this.rateLimitRepository = deps.rateLimitRepository;
  }

  /**
   * Ejecuta el flujo completo de cambio de contraseña.
   *
   * @param userId - ID del usuario autenticado (extraído del JWT)
   * @param currentPassword - Contraseña actual proporcionada por el usuario
   * @param newPassword - Nueva contraseña deseada
   * @throws {RateLimitExceededError} Si se excedieron los intentos permitidos
   * @throws {UserNotFoundError} Si el userId no corresponde a un usuario existente
   * @throws {InvalidCurrentPasswordError} Si la contraseña actual no coincide
   * @throws {PasswordValidationError} Si la nueva contraseña no cumple requisitos
   * @throws {SameAsCurrentError} Si la nueva contraseña es idéntica a la actual
   */
  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const key = changePwdKey(userId);

    // 1. Rate limit check
    await this.checkRateLimit(key);

    // 2. Find user by ID
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // 3. Verify current password
    const isCurrentValid = await this.passwordService.verify(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      await this.recordFailedAttempt(key);
      throw new InvalidCurrentPasswordError();
    }

    // 4. Sanitize and validate new password
    const sanitizedNewPassword = sanitizePasswordInput(newPassword);
    const validationResult = validatePassword(sanitizedNewPassword);
    if (!validationResult.isValid) {
      throw new PasswordValidationError(validationResult);
    }

    // 5. Check new password is not same as current
    const isSameAsCurrent = await this.passwordService.verify(
      sanitizedNewPassword,
      user.passwordHash,
    );
    if (isSameAsCurrent) {
      throw new SameAsCurrentError();
    }

    // 6. Hash new password (bcrypt, cost factor 12)
    const newHash = await this.passwordService.hash(sanitizedNewPassword);

    // 7. Update password hash in DB
    const updated = await this.userRepository.updatePasswordHash(userId, newHash);
    if (!updated) {
      throw new Error('No se pudo actualizar la contraseña. Intenta más tarde.');
    }

    // 8. Reset rate limit counter on success
    await this.resetRateLimit(key);
  }

  // ─── Private Methods ─────────────────────────────────────────────────────────

  /**
   * Verifica si el usuario está bloqueado por rate limiting.
   */
  private async checkRateLimit(key: string): Promise<void> {
    const record = await this.rateLimitRepository.findByKey(key);
    const now = new Date();

    if (record?.blockedUntil && record.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil(
        (record.blockedUntil.getTime() - now.getTime()) / 1000,
      );
      throw new RateLimitExceededError(retryAfterSeconds);
    }
  }

  /**
   * Registra un intento fallido de cambio de contraseña.
   */
  private async recordFailedAttempt(key: string): Promise<void> {
    await this.rateLimitRepository.upsertAttempt(
      key,
      WINDOW_MS,
      BLOCK_DURATION_MS,
      MAX_ATTEMPTS,
    );
  }

  /**
   * Resetea el contador de intentos fallidos tras un cambio exitoso.
   */
  private async resetRateLimit(key: string): Promise<void> {
    await this.rateLimitRepository.resetByKey(key);
  }
}
