import type {
  ChangePasswordErrorCode,
  PasswordRule,
} from '@multibotagents/types';

// ─── Form State Types ────────────────────────────────────────────────────────

/** Valores del formulario de cambio de contraseña. */
export interface ChangePasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Estados posibles del proceso de cambio de contraseña. */
export type ChangePasswordStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── Error Types ─────────────────────────────────────────────────────────────

/** Error de UI con código, mensaje y reglas fallidas opcionales. */
export interface ChangePasswordUIError {
  /** Código de error del backend o del cliente. */
  code: ChangePasswordErrorCode | 'NETWORK_ERROR' | 'TIMEOUT';
  /** Mensaje descriptivo para mostrar al usuario. */
  message: string;
  /** Reglas de contraseña que no se cumplieron (presente cuando code es VALIDATION_FAILED). */
  failedRules?: PasswordRule[];
}

// ─── Field State Types ───────────────────────────────────────────────────────

/** Estado de un campo de contraseña individual. */
export interface PasswordFieldState {
  /** Valor actual del campo. */
  value: string;
  /** Indica si el texto es visible (tipo text) o enmascarado (tipo password). */
  visible: boolean;
  /** Mensaje de error inline asociado al campo. */
  error?: string;
}
