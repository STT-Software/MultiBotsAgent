import { EmailVerificationErrorCode } from '@multibotagents/types';

/**
 * Error lanzado cuando el token no tiene formato válido o no existe en la BD.
 * Validates: Requirement 4.5, 4.6
 */
export class TokenInvalidError extends Error {
  readonly code = EmailVerificationErrorCode.TOKEN_INVALID;

  constructor(message = 'El link no es válido') {
    super(message);
    this.name = 'TokenInvalidError';
  }
}

/**
 * Error lanzado cuando el token ha expirado (expiresAt < now).
 * Validates: Requirement 4.8
 */
export class TokenExpiredError extends Error {
  readonly code = EmailVerificationErrorCode.TOKEN_EXPIRED;

  constructor(public readonly userId: string) {
    super('Token expired');
    this.name = 'TokenExpiredError';
  }
}

/**
 * Error lanzado cuando el token ya fue utilizado (usedAt != null).
 * Validates: Requirement 4.7
 */
export class TokenAlreadyUsedError extends Error {
  readonly code = EmailVerificationErrorCode.TOKEN_ALREADY_USED;

  constructor(message = 'El link ya fue utilizado') {
    super(message);
    this.name = 'TokenAlreadyUsedError';
  }
}

/**
 * Error lanzado cuando el email del usuario ya está verificado.
 * Validates: Requirement 4.8 (reenvío cuando ya verificado)
 */
export class AlreadyVerifiedError extends Error {
  readonly code = EmailVerificationErrorCode.ALREADY_VERIFIED;

  constructor(message = 'Email ya verificado') {
    super(message);
    this.name = 'AlreadyVerifiedError';
  }
}

/**
 * Error lanzado cuando el usuario intenta reenviar antes de que expire el cooldown de 60s.
 * Validates: Requirement 5.6
 */
export class ResendCooldownError extends Error {
  readonly code = EmailVerificationErrorCode.RESEND_COOLDOWN;

  constructor(public readonly retryAfterSeconds: number) {
    super('Resend cooldown active');
    this.name = 'ResendCooldownError';
  }
}
