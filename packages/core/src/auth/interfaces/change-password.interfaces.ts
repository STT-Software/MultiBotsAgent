/**
 * Interfaces y errores tipados del servicio de cambio de contraseña.
 *
 * Define las dependencias del servicio y errores específicos del dominio
 * para cada caso de fallo del flujo de cambio de contraseña.
 */
import type { PasswordValidationResult, IRateLimitRepository } from '@multibotagents/types';
import type { PasswordService } from '../password.service';

// ─── User Entity (para el servicio de cambio de contraseña) ──────────────────

/** Entidad de usuario mínima requerida por el servicio de cambio de contraseña. */
export interface ChangePasswordUser {
  id: string;
  passwordHash: string;
}

// ─── Repository Interface ────────────────────────────────────────────────────

/** Interfaz del repositorio de usuario para el servicio de cambio de contraseña. */
export interface IChangePasswordUserRepository {
  /** Busca un usuario por ID. Retorna null si no existe. */
  findById(userId: string): Promise<ChangePasswordUser | null>;
  /** Actualiza el hash de contraseña de un usuario de forma atómica. */
  updatePasswordHash(userId: string, newHash: string): Promise<boolean>;
}

// ─── Service Dependencies ────────────────────────────────────────────────────

/** Dependencias inyectables del servicio de cambio de contraseña. */
export interface ChangePasswordDeps {
  userRepository: IChangePasswordUserRepository;
  passwordService: PasswordService;
  rateLimitRepository: IRateLimitRepository;
}

// ─── Domain Error Base ───────────────────────────────────────────────────────

/**
 * Error base del dominio de cambio de contraseña.
 * Todos los errores específicos extienden de esta clase.
 */
export class ChangePasswordError extends Error {
  /** Código de error para identificación programática. */
  readonly code: string;
  /** HTTP status code sugerido para el handler. */
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Domain Errors ───────────────────────────────────────────────────────────

/**
 * Error: la contraseña actual proporcionada no coincide con el hash almacenado.
 * HTTP 400 — no revela si el usuario existe o no (seguridad).
 */
export class InvalidCurrentPasswordError extends ChangePasswordError {
  constructor() {
    super(
      'La contraseña actual no es correcta',
      'INVALID_CURRENT_PASSWORD',
      400,
    );
  }
}

/**
 * Error: la nueva contraseña es idéntica a la contraseña actual.
 * HTTP 400 — la nueva contraseña debe ser diferente.
 */
export class SameAsCurrentError extends ChangePasswordError {
  constructor() {
    super(
      'La nueva contraseña debe ser diferente a la actual',
      'SAME_AS_CURRENT',
      400,
    );
  }
}

/**
 * Error: la nueva contraseña no cumple los requisitos de seguridad.
 * HTTP 400 — incluye el resultado de validación con las reglas fallidas.
 */
export class PasswordValidationError extends ChangePasswordError {
  /** Resultado completo de la validación con detalle de cada regla. */
  readonly validationResult: PasswordValidationResult;

  constructor(validationResult: PasswordValidationResult) {
    super(
      'La nueva contraseña no cumple los requisitos de seguridad',
      'VALIDATION_FAILED',
      400,
    );
    this.validationResult = validationResult;
  }
}

/**
 * Error: el userId del JWT no corresponde a un usuario existente.
 * HTTP 400 — mensaje genérico para no revelar información interna.
 */
export class UserNotFoundError extends ChangePasswordError {
  constructor() {
    super(
      'No se pudo procesar la solicitud',
      'USER_NOT_FOUND',
      400,
    );
  }
}

/**
 * Error: se excedió el número máximo de intentos de cambio de contraseña.
 * HTTP 429 — incluye los segundos restantes de bloqueo.
 */
export class RateLimitExceededError extends ChangePasswordError {
  /** Segundos restantes hasta que se permita un nuevo intento. */
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      `Demasiados intentos. Intenta de nuevo en ${retryAfterSeconds} segundos`,
      'RATE_LIMIT_EXCEEDED',
      429,
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
