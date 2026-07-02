'use client';

import type { PasswordValidationResult } from '@multibotagents/types';
import type {
  ChangePasswordFormState,
  ChangePasswordStatus,
  ChangePasswordUIError,
} from '../types';
import { PasswordInput } from './PasswordInput';
import { PasswordRequirements } from './PasswordRequirements';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ChangePasswordFormProps {
  /** Valores actuales del formulario. */
  formState: ChangePasswordFormState;
  /** Estado del proceso de cambio de contraseña. */
  status: ChangePasswordStatus;
  /** Error de UI cuando status es 'error'. */
  error: ChangePasswordUIError | null;
  /** Resultado de validación de reglas de la nueva contraseña. */
  validationResult: PasswordValidationResult;
  /** null si confirmación vacía/no interactuada, true si coincide, false si no. */
  isMatch: boolean | null;
  /** Mensaje de error cuando las contraseñas no coinciden. */
  matchError: string | null;
  /** Handler para actualizar un campo del formulario. */
  onFieldChange: (field: keyof ChangePasswordFormState, value: string) => void;
  /** Handler para enviar el formulario. */
  onSubmit: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Formulario de cambio de contraseña con 3 campos, indicadores de requisitos
 * y lógica de habilitación del botón de envío.
 *
 * El botón se deshabilita cuando:
 * - El status es 'loading'
 * - Algún campo está vacío o contiene solo espacios
 * - La nueva contraseña no cumple las reglas de validación
 * - La confirmación no coincide con la nueva contraseña
 */
export function ChangePasswordForm({
  formState,
  status,
  error,
  validationResult,
  isMatch,
  matchError,
  onFieldChange,
  onSubmit,
}: ChangePasswordFormProps) {
  const isLoading = status === 'loading';

  // Determinar si todos los campos tienen contenido no-whitespace
  const allFieldsFilled =
    formState.currentPassword.trim().length > 0 &&
    formState.newPassword.trim().length > 0 &&
    formState.confirmPassword.trim().length > 0;

  // Botón habilitado solo cuando se cumplen todas las condiciones
  const isSubmitDisabled =
    isLoading ||
    !allFieldsFilled ||
    !validationResult.isValid ||
    isMatch !== true;

  // Determinar errores inline por campo
  const currentPasswordError =
    error?.code === 'INVALID_CURRENT_PASSWORD' ? error.message : undefined;

  const newPasswordError =
    error?.code === 'SAME_AS_CURRENT' ? error.message : undefined;

  const confirmPasswordError = matchError ?? undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitDisabled) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Contraseña actual */}
      <PasswordInput
        id="current-password"
        label="Contraseña actual"
        value={formState.currentPassword}
        onChange={(value) => onFieldChange('currentPassword', value)}
        error={currentPasswordError}
        autoComplete="current-password"
        disabled={isLoading}
      />

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
            Cambiando contraseña...
          </span>
        ) : (
          'Cambiar contraseña'
        )}
      </button>
    </form>
  );
}
