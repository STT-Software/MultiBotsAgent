/**
 * Tipos del dominio de verificación de email.
 * Define DTOs de respuesta, error codes y payload para el flujo de verificación.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** Error codes específicos de verificación de email. */
export enum EmailVerificationErrorCode {
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_ALREADY_USED = 'TOKEN_ALREADY_USED',
  ALREADY_VERIFIED = 'ALREADY_VERIFIED',
  RESEND_COOLDOWN = 'RESEND_COOLDOWN',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

/** DTO para la respuesta del endpoint de verificación. */
export interface VerifyEmailResponse {
  verified: boolean;
  message: string;
  /** Indica si el usuario tiene sesión activa (para decidir redirect). */
  hasActiveSession?: boolean;
}

/** DTO para la respuesta del endpoint de reenvío. */
export interface ResendVerificationResponse {
  success: boolean;
  message: string;
  /** Email al que se reenvió (parcialmente oculto). */
  email?: string;
}

// ─── Payload ─────────────────────────────────────────────────────────────────

/** Payload del email de verificación en la cola. */
export interface VerificationEmailPayload {
  token: string;
  url: string;
  username: string;
}
