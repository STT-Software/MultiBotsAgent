'use client';

import Link from 'next/link';
import type {
  ForgotPasswordFormState,
  PasswordRecoveryStatus,
  ForgotPasswordUIError,
} from '../types';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ForgotPasswordFormProps {
  /** Valores actuales del formulario. */
  formState: ForgotPasswordFormState;
  /** Estado del proceso de solicitud. */
  status: PasswordRecoveryStatus;
  /** Error de UI cuando status es 'error'. */
  error: ForgotPasswordUIError | null;
  /** Handler para actualizar el campo email. */
  onEmailChange: (value: string) => void;
  /** Handler para enviar el formulario. */
  onSubmit: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Formulario de solicitud de restablecimiento de contraseña.
 * Campo email, botón enviar, link "Volver a login", estado loading.
 */
export function ForgotPasswordForm({
  formState,
  status,
  error,
  onEmailChange,
  onSubmit,
}: ForgotPasswordFormProps) {
  const isLoading = status === 'loading';
  const isEmailValid = formState.email.trim().length > 0 && isValidEmail(formState.email);
  const isSubmitDisabled = isLoading || !isEmailValid;

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
          Recuperar contraseña
        </h2>
        <p className="mt-1.5 text-xs text-gray-400 sm:text-sm">
          Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña.
        </p>
      </div>

      {/* Server error */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error.message}
        </div>
      )}

      {/* Email field */}
      <div className="space-y-1.5">
        <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-300">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={formState.email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="ejemplo@empresa.com"
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-700 bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-200 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3"
          aria-required="true"
        />
      </div>

      {/* Submit button */}
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
            Enviando...
          </span>
        ) : (
          'Enviar instrucciones'
        )}
      </button>

      {/* Back to login link */}
      <p className="text-center text-sm text-gray-400">
        <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
          Volver a login
        </Link>
      </p>
    </form>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
