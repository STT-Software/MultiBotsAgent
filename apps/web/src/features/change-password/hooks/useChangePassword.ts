'use client';

import { useState, useCallback, useRef } from 'react';
import { AuthStore } from '@/lib/auth';
import { changePassword } from '../services';
import type {
  ChangePasswordFormState,
  ChangePasswordStatus,
  ChangePasswordUIError,
} from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseChangePasswordReturn {
  /** Valores actuales del formulario. */
  formState: ChangePasswordFormState;
  /** Estado del proceso de cambio de contraseña. */
  status: ChangePasswordStatus;
  /** Error de UI cuando status es 'error'. */
  error: ChangePasswordUIError | null;
  /** Actualiza el valor de un campo del formulario. */
  handleFieldChange: (field: keyof ChangePasswordFormState, value: string) => void;
  /** Envía el formulario de cambio de contraseña. */
  submit: () => Promise<void>;
  /** Resetea el formulario al estado inicial. */
  reset: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INITIAL_FORM_STATE: ChangePasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook principal del feature de cambio de contraseña.
 *
 * Orquesta el flujo de submit:
 * - Obtiene el access token de AuthStore
 * - Llama al servicio changePassword
 * - En éxito: limpia campos, establece status 'success'
 * - En error: preserva campos, establece status 'error', almacena error info
 *
 * @returns Estado del formulario, handlers y funciones de control
 */
export function useChangePassword(): UseChangePasswordReturn {
  const [formState, setFormState] = useState<ChangePasswordFormState>(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<ChangePasswordStatus>('idle');
  const [error, setError] = useState<ChangePasswordUIError | null>(null);
  const abortRef = useRef(false);

  const handleFieldChange = useCallback(
    (field: keyof ChangePasswordFormState, value: string) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      // Limpiar error previo cuando el usuario modifica un campo
      if (status === 'error') {
        setError(null);
        setStatus('idle');
      }
    },
    [status],
  );

  const submit = useCallback(async () => {
    const token = AuthStore.getToken();

    if (!token) {
      setError({
        code: 'NETWORK_ERROR',
        message: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
      });
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      await changePassword(
        formState.currentPassword,
        formState.newPassword,
        token,
      );

      if (!abortRef.current) {
        // Éxito: limpiar campos y establecer status success
        setFormState(INITIAL_FORM_STATE);
        setStatus('success');
      }
    } catch (err: unknown) {
      if (abortRef.current) return;

      // Preservar valores del formulario en error
      const uiError = err as ChangePasswordUIError;
      setError(uiError);
      setStatus('error');
    }
  }, [formState.currentPassword, formState.newPassword]);

  const reset = useCallback(() => {
    setFormState(INITIAL_FORM_STATE);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    formState,
    status,
    error,
    handleFieldChange,
    submit,
    reset,
  };
}
