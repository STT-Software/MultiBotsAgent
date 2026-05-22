import type {
  ResetPasswordErrorCode,
  PasswordRule,
} from '@multibotagents/types';

// ─── Form State Types ────────────────────────────────────────────────────────

/** Valores del formulario de solicitud de reset. */
export interface ForgotPasswordFormState {
  email: string;
}

/** Valores del formulario de nueva contraseña. */
export interface ResetPasswordFormState {
  newPassword: string;
  confirmPassword: string;
}

/** Estados posibles del proceso. */
export type PasswordRecoveryStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── Error Types ─────────────────────────────────────────────────────────────

/** Error de UI para forgot-password. */
export interface ForgotPasswordUIError {
  code: 'NETWORK_ERROR' | 'TIMEOUT' | 'SERVER_ERROR' | 'INVALID_EMAIL';
  message: string;
}

/** Error de UI para reset-password. */
export interface ResetPasswordUIError {
  code: ResetPasswordErrorCode | 'NETWORK_ERROR' | 'TIMEOUT';
  message: string;
  failedRules?: PasswordRule[];
}

/** Tipo de error de token para mostrar en TokenError component. */
export type TokenErrorType = 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_ALREADY_USED';
