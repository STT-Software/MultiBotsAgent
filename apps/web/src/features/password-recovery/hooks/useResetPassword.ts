'use client';

import { useState, useCallback } from 'react';
import { usePasswordValidation } from '@/features/change-password/hooks';
import { resetPassword } from '../services';
import type {
  ResetPasswordFormState,
  PasswordRecoveryStatus,
  ResetPasswordUIError,
  TokenErrorType,
} from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseResetPasswordReturn {
  /** Valores actuales del formulario. */
  formState: ResetPasswordFormState;
  /** Estado del proceso de reset. */
  status: PasswordRecoveryStatus;
  /** Error de UI cuando status es 'error'. */
  serverError: ResetPasswordUIError | null;
  /** Error de token (inválido, expirado, usado). */
  tokenError: TokenErrorType | null;
  /** Resultado de validación de reglas de la nueva contraseña. */
  validationResult: ReturnType<typeof usePasswordValidation>['validationResult'];
  /** null si confirmación vacía/no interactuada, true si coincide, false si no. */
  isMatch: ReturnType<typeof usePasswordValidation>['isMatch'];
  /** Mensaje de error cuando las contraseñas no coinciden. */
  matchError: ReturnType<typeof usePasswordValidation>['matchError'];
  /** Actualiza el valor de un campo del formulario. */
  handleFieldChange: (field: keyof ResetPasswordFormState, value: string) => void;
  /** Envía el formulario de reset de contraseña. */
  submit: (token: string) => Promise<void>;
  /** Resetea el formulario al estado inicial. */
  reset: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INITIAL_FORM_STATE: ResetPasswordFormState = {
  newPassword: '',
  confirmPassword: '',
};

const TOKEN_ERROR_CODES: TokenErrorType[] = [
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'TOKEN_ALREADY_USED',
];

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook principal del flujo reset-password.
 *
 * Orquesta el flujo de submit:
 * - Usa usePasswordValidation para validación en tiempo real
 * - Llama al servicio resetPassword con token y nueva contraseña
 * - En éxito: establece status 'success'
 * - En error de token: establece tokenError
 * - En error genérico: establece serverError
 */
export function useResetPassword(): UseResetPasswordReturn {
  const [formState, setFormState] = useState<ResetPasswordFormState>(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<PasswordRecoveryStatus>('idle');
  const [serverError, setServerError] = useState<ResetPasswordUIError | null>(null);
  const [tokenError, setTokenError] = useState<TokenErrorType | null>(null);

  const { validationResult, isMatch, matchError } = usePasswordValidation({
    newPassword: formState.newPassword,
    confirmPassword: formState.confirmPassword,
  });

  const handleFieldChange = useCallback(
    (field: keyof ResetPasswordFormState, value: string) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      if (status === 'error') {
        setServerError(null);
        setStatus('idle');
      }
    },
    [status],
  );

  const submit = useCallback(
    async (token: string) => {
      setStatus('loading');
      setServerError(null);
      setTokenError(null);

      try {
        await resetPassword(token, formState.newPassword);
        setStatus('success');
      } catch (err: unknown) {
        const uiError = err as ResetPasswordUIError;

        // Check if it's a token error
        if (TOKEN_ERROR_CODES.includes(uiError.code as TokenErrorType)) {
          setTokenError(uiError.code as TokenErrorType);
        }

        setServerError(uiError);
        setStatus('error');
      }
    },
    [formState.newPassword],
  );

  const reset = useCallback(() => {
    setFormState(INITIAL_FORM_STATE);
    setStatus('idle');
    setServerError(null);
    setTokenError(null);
  }, []);

  return {
    formState,
    status,
    serverError,
    tokenError,
    validationResult,
    isMatch,
    matchError,
    handleFieldChange,
    submit,
    reset,
  };
}
