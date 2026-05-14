'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { Toast } from '@/components/ui';
import { useChangePassword } from './hooks';
import { usePasswordValidation } from './hooks';
import { ChangePasswordForm } from './components';
import type { ToastVariant } from '@/components/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ToastState {
  visible: boolean;
  variant: ToastVariant;
  message: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INITIAL_TOAST_STATE: ToastState = {
  visible: false,
  variant: 'success',
  message: '',
};

/**
 * Contenedor principal del feature de cambio de contraseña.
 *
 * Orquesta los hooks de estado/submit y validación en tiempo real,
 * y pasa todas las props necesarias al formulario.
 *
 * Integra notificaciones toast accesibles:
 * - Éxito: visible 5s, descartable, role="status"
 * - Error: visible hasta descarte manual, role="alert"
 */
export default function ChangePasswordContainer() {
  const {
    formState,
    status,
    error,
    handleFieldChange,
    submit,
  } = useChangePassword();

  const { validationResult, isMatch, matchError } = usePasswordValidation({
    newPassword: formState.newPassword,
    confirmPassword: formState.confirmPassword,
  });

  const [toast, setToast] = useState<ToastState>(INITIAL_TOAST_STATE);

  // Mostrar toast cuando el status cambia a 'success' o 'error'
  useEffect(() => {
    if (status === 'success') {
      setToast({
        visible: true,
        variant: 'success',
        message: 'Contraseña actualizada exitosamente',
      });
    } else if (status === 'error' && error) {
      // Solo mostrar toast para errores que no son inline (errores de red, timeout, rate limit, server)
      const toastErrorCodes = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT_EXCEEDED', 'SERVER_ERROR'];
      if (toastErrorCodes.includes(error.code)) {
        setToast({
          visible: true,
          variant: 'error',
          message: error.message,
        });
      }
    }
  }, [status, error]);

  const handleDismissToast = useCallback(() => {
    setToast(INITIAL_TOAST_STATE);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] text-[#49df9a]">
          <Lock className="h-4 w-4" strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-[family-name:var(--font-geist-sans)] text-[28px] font-bold leading-[1.2] text-[#dde5dc]">
            Cambiar contraseña
          </h1>
          <p className="font-[family-name:var(--font-inter)] text-sm text-[#bbcabe]">
            Actualiza tu contraseña para mantener tu cuenta segura.
          </p>
        </div>
      </div>

      {/* Toast notification */}
      {toast.visible && (
        <div className="max-w-lg">
          <Toast
            message={toast.message}
            variant={toast.variant}
            onDismiss={handleDismissToast}
          />
        </div>
      )}

      {/* Form Card */}
      <div className="max-w-lg">
        <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 transition-all duration-200 hover:border-[rgba(0,187,122,0.3)] hover:shadow-[inset_0_0_12px_rgba(0,187,122,0.04)]">
          <ChangePasswordForm
            formState={formState}
            status={status}
            error={error}
            validationResult={validationResult}
            isMatch={isMatch}
            matchError={matchError}
            onFieldChange={handleFieldChange}
            onSubmit={submit}
          />
        </div>
      </div>
    </div>
  );
}
