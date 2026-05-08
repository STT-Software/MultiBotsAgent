/**
 * Tipos de error del dominio para el flujo de registro.
 * Define clases de error tipadas y interfaces de respuesta de error HTTP.
 */

// ─── Base Error ──────────────────────────────────────────────────────────────

/** Códigos de error del dominio para identificación programática. */
export enum DomainErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  CAPTCHA_ERROR = 'CAPTCHA_ERROR',
  TOKEN_GENERATION_ERROR = 'TOKEN_GENERATION_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  CONCURRENCY_CONFLICT = 'CONCURRENCY_CONFLICT',
}

/**
 * Error base del dominio.
 * Todas las clases de error del dominio extienden de esta clase.
 */
export class DomainError extends Error {
  /** Código de error para identificación programática. */
  readonly code: DomainErrorCode;

  /** HTTP status code sugerido para el handler. */
  readonly statusCode: number;

  constructor(message: string, code: DomainErrorCode, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    // Restaurar prototype chain (necesario para extends de Error en TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Domain Errors ───────────────────────────────────────────────────────────

/**
 * Error de validación de datos de entrada.
 * Contiene detalle de campos específicos que fallaron la validación.
 *
 * @example
 * throw new ValidationError({ email: 'Formato de email inválido', password: 'Mínimo 8 caracteres' });
 */
export class ValidationError extends DomainError {
  /** Mapa de campo → mensaje de error para cada campo inválido. */
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    super('Datos de registro inválidos', DomainErrorCode.VALIDATION_ERROR, 400);
    this.fields = fields;
  }
}

/**
 * Error de email duplicado.
 * Se lanza cuando se intenta registrar un email que ya existe en el sistema.
 */
export class DuplicateEmailError extends DomainError {
  /** Email que causó el conflicto. */
  readonly email: string;

  constructor(email: string) {
    super(
      'Ya existe una cuenta con este email. ¿Deseas iniciar sesión?',
      DomainErrorCode.DUPLICATE_EMAIL,
      409,
    );
    this.email = email;
  }
}

/**
 * Error de verificación CAPTCHA.
 * Se lanza cuando el token CAPTCHA es inválido o ha expirado.
 */
export class CaptchaError extends DomainError {
  constructor() {
    super(
      'El challenge de seguridad no fue superado. Intenta nuevamente.',
      DomainErrorCode.CAPTCHA_ERROR,
      403,
    );
  }
}

/**
 * Error de generación de tokens criptográficos.
 * Se lanza cuando crypto.randomBytes no está disponible o falla.
 */
export class TokenGenerationError extends DomainError {
  constructor() {
    super(
      'Error interno del servidor',
      DomainErrorCode.TOKEN_GENERATION_ERROR,
      500,
    );
  }
}

/**
 * Error de transacción de base de datos.
 * Se lanza cuando una transacción MongoDB falla o no puede completarse.
 */
export class TransactionError extends DomainError {
  constructor() {
    super(
      'Error interno del servidor',
      DomainErrorCode.TRANSACTION_ERROR,
      500,
    );
  }
}

/**
 * Error de conflicto de concurrencia.
 * Se lanza cuando una race condition causa un conflicto durante el registro simultáneo.
 */
export class ConcurrencyConflictError extends DomainError {
  constructor() {
    super(
      'Ya existe una cuenta con este email',
      DomainErrorCode.CONCURRENCY_CONFLICT,
      409,
    );
  }
}

// ─── Error Response Interfaces ───────────────────────────────────────────────

/** Respuesta de error genérica del API. */
export interface ErrorResponse {
  /** Mensaje descriptivo para el usuario. */
  error: string;
}

/** Respuesta de error de validación con detalle de campos. */
export interface ValidationErrorResponse extends ErrorResponse {
  /** Mapa de campo → mensaje de error para cada campo inválido. */
  fields: Record<string, string>;
}

// ─── Auth Error Codes (Autenticación) ────────────────────────────────────────

/** Códigos de error específicos del sistema de autenticación (login, refresh, logout). */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  COMPANY_PENDING_DELETION = 'COMPANY_PENDING_DELETION',
  COMPANY_INACTIVE = 'COMPANY_INACTIVE',
  SESSION_REPLACED = 'SESSION_REPLACED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/** Respuesta de error estándar del API de autenticación. */
export interface AuthErrorResponse {
  error: {
    code: AuthErrorCode;
    message: string;
  };
}

// ─── Auth Domain Errors ──────────────────────────────────────────────────────

/**
 * Error de credenciales inválidas.
 * Se lanza tanto para email inexistente como para contraseña incorrecta
 * (indistinguible para prevenir enumeración de usuarios).
 */
export class InvalidCredentialsError extends DomainError {
  readonly authCode = AuthErrorCode.INVALID_CREDENTIALS;

  constructor() {
    super(
      'Email o contraseña incorrectos',
      DomainErrorCode.VALIDATION_ERROR,
      401,
    );
  }
}

/**
 * Error de rate limit excedido.
 * Se lanza cuando se superan los intentos permitidos por IP o email.
 */
export class RateLimitExceededError extends DomainError {
  readonly authCode = AuthErrorCode.RATE_LIMIT_EXCEEDED;
  /** Segundos restantes de bloqueo. */
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      `Demasiados intentos. Intenta de nuevo en ${retryAfterSeconds} segundos.`,
      DomainErrorCode.VALIDATION_ERROR,
      429,
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Error de empresa en estado pending_deletion.
 * Se lanza cuando las credenciales son válidas pero la empresa está marcada para eliminación.
 */
export class CompanyPendingDeletionError extends DomainError {
  readonly authCode = AuthErrorCode.COMPANY_PENDING_DELETION;
  /** Fecha programada de eliminación. */
  readonly deletionDate: Date;

  constructor(deletionDate: Date) {
    super(
      'Tu cuenta está programada para eliminación. Puedes reactivarla desde el panel.',
      DomainErrorCode.VALIDATION_ERROR,
      403,
    );
    this.deletionDate = deletionDate;
  }
}

/**
 * Error de empresa inactiva.
 * Se lanza cuando se intenta operar con una empresa que no está en estado 'active'.
 */
export class CompanyInactiveError extends DomainError {
  readonly authCode = AuthErrorCode.COMPANY_INACTIVE;

  constructor() {
    super(
      'La empresa asociada a tu cuenta no está activa.',
      DomainErrorCode.VALIDATION_ERROR,
      403,
    );
  }
}

/**
 * Error de sesión reemplazada.
 * Se lanza cuando el refresh token fue revocado porque el usuario inició sesión en otro dispositivo.
 */
export class SessionReplacedError extends DomainError {
  readonly authCode = AuthErrorCode.SESSION_REPLACED;

  constructor() {
    super(
      'Tu sesión se cerró porque iniciaste sesión en otro dispositivo. Si no fuiste tú, cambia tu contraseña.',
      DomainErrorCode.VALIDATION_ERROR,
      401,
    );
  }
}

/**
 * Error de token expirado.
 * Se lanza cuando el refresh token ha expirado naturalmente por tiempo.
 */
export class TokenExpiredError extends DomainError {
  readonly authCode = AuthErrorCode.TOKEN_EXPIRED;

  constructor() {
    super(
      'Tu sesión ha expirado. Inicia sesión nuevamente.',
      DomainErrorCode.VALIDATION_ERROR,
      401,
    );
  }
}
