'use client';

import type { PasswordValidationResult } from '@multibotagents/types';
import { PasswordInput } from '@/features/change-password/components';
import { PasswordRequirements } from '@/features/change-password/components';
import type {
  ResetPasswordFormState,
  PasswordRecoveryStatus,
  ResetPasswordUIError,
} from '../types';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ResetPasswordFormProps {
  /** Valores actuales del formulario. */
  formState: ResetPasswordFormState;
  /** Estado del proceso de reset. */
  status: PasswordRecoveryStatus;
  /** Error de UI cuando status es 'error'. */
  serverError: ResetPasswordUIError | null;
  /** Resultado de validación de reglas de la nueva contraseña. */
  validationResult: PasswordValidationResult;
  /** null si confirmación vacía/no interactuada, true si coincide, false si no. */
  isMatch: boolean | null;
  /** Mensaje de error cuando las contraseñas no coinciden. */
  matchError: string | null;
  /** Handler para actualizar un campo del formulario. */
  onFieldChange: (field: keyof ResetPasswordFormState, value: string) => void;
  /** Handler para enviar el formulario. */
  onSubmit: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Formulario de nueva contraseña con campos nueva contraseña + confirmación,
 * toggle visibilidad, PasswordRequirements, botón enviar y estado loading.
 */
export function ResetPasswordForm({
  formState,
  status,
  serverError,
  validationResult,
  isMatch,
  matchError,
  onFieldChange,
  onSubmit,
}: ResetPasswordFormProps) {
  const isLoading = status === 'loading';

  // Botón habilitado solo cuando se cumplen todas las condiciones
  const allFieldsFilled =
    formState.newPassword.trim().length > 0 &&
    formState.confirmPassword.trim().length > 0;

  const isSubmitDisabled =
    isLoading ||
    !allFieldsFilled ||
    !validationResult.isValid ||
    isMatch !== true;

  // Error inline para nueva contraseña (solo VALIDATION_FAILED del server)
  const newPasswordError =
    serverError?.code === 'VALIDATION_FAILED' ? serverError.message : undefined;

  const confirmPasswordError = matchError ?? undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitDisabled) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Title */}
      <div className="mb-3 sm:mb-4">
        <h2 className="text-[clamp(1.375rem,3vw,1.875rem)] font-bold text-white">
          Nueva contraseña
        </h2>
        <p className="mt-1.5 text-xs text-gray-400 sm:text-sm">
          Establece una nueva contraseña para tu cuenta.
        </p>
      </div>

      {/* Server error (non-token, non-validation) */}
      {serverError && serverError.code !== 'VALIDATION_FAILED' && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {serverError.message}
        </div>
      )}

      {/* Nueva contraseña */}
      <div className="space-y-3">
        <PasswordInput
          id="new-password"
          label="Nueva contraseña"
          value={formState.newPassword}
          onChange={(value) => onFieldChange('newPassword', value)}
          error={newPasswordError}
          autoComplete="new-password"
          disabled={isLoading}
        />

        {/* Requisitos de contraseña — siempre visible debajo del campo */}
        <PasswordRequirements rules={validationResult.rules} password={formState.newPassword} />
      </div>

      {/* Confirmar nueva contraseña */}
      <PasswordInput
        id="confirm-password"
        label="Confirmar nueva contraseña"
        value={formState.confirmPassword}
        onChange={(value) => onFieldChange('confirmPassword', value)}
        error={confirmPasswordError}
        autoComplete="new-password"
        disabled={isLoading}
      />

      {/* Botón de envío */}
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:hover:shadow-none sm:py-3"
      >
        {isLoading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Restableciendo...
          </span>
        ) : (
          'Restablecer contraseña'
        )}
      </button>
    </form>
  );
}
