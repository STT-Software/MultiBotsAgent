'use client';

import { useState, useCallback } from 'react';
import { forgotPassword } from '../services';
import type {
  ForgotPasswordFormState,
  PasswordRecoveryStatus,
  ForgotPasswordUIError,
} from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseForgotPasswordReturn {
  /** Valores actuales del formulario. */
  formState: ForgotPasswordFormState;
  /** Estado del proceso de solicitud. */
  status: PasswordRecoveryStatus;
  /** Error de UI cuando status es 'error'. */
  error: ForgotPasswordUIError | null;
  /** Actualiza el valor del campo email. */
  handleEmailChange: (value: string) => void;
  /** Envía el formulario de solicitud de reset. */
  submit: () => Promise<void>;
  /** Resetea el formulario al estado inicial. */
  reset: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INITIAL_FORM_STATE: ForgotPasswordFormState = {
  email: '',
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook principal del flujo forgot-password.
 *
 * Orquesta el flujo de submit:
 * - Llama al servicio forgotPassword
 * - En éxito: establece status 'success' (muestra mensaje genérico)
 * - En error: establece status 'error', almacena error info
 */
export function useForgotPassword(): UseForgotPasswordReturn {
  const [formState, setFormState] = useState<ForgotPasswordFormState>(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<PasswordRecoveryStatus>('idle');
  const [error, setError] = useState<ForgotPasswordUIError | null>(null);

  const handleEmailChange = useCallback(
    (value: string) => {
      setFormState({ email: value });
      if (status === 'error') {
        setError(null);
        setStatus('idle');
      }
    },
    [status],
  );

  const submit = useCallback(async () => {
    const trimmedEmail = formState.email.trim().toLowerCase();

    if (!trimmedEmail) {
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      await forgotPassword(trimmedEmail);
      setStatus('success');
    } catch (err: unknown) {
      const uiError = err as ForgotPasswordUIError;
      setError(uiError);
      setStatus('error');
    }
  }, [formState.email]);

  const reset = useCallback(() => {
    setFormState(INITIAL_FORM_STATE);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    formState,
    status,
    error,
    handleEmailChange,
    submit,
    reset,
  };
}
