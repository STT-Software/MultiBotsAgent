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
