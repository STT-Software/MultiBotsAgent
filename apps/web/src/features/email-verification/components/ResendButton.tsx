'use client';

import { useEffect, useState } from 'react';

import { useResendVerification } from '../hooks/useResendVerification';

interface ResendButtonProps {
  /** Optional expired token to pass to the resend API */
  expiredToken?: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * Botón de reenvío de verificación con cooldown visual y confirmación de éxito.
 * Usa internamente el hook `useResendVerification` para manejar estado y cooldown.
 */
export function ResendButton({ expiredToken, className }: ResendButtonProps) {
  const { resend, isPending, cooldownSeconds, result, error } = useResendVerification();
  const [showSuccess, setShowSuccess] = useState(false);

  // Show success message briefly after a successful resend
  useEffect(() => {
    if (result) {
      setShowSuccess(true);
      const timeout = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timeout);
    }
  }, [result]);

  const isDisabled = isPending || cooldownSeconds > 0;

  const handleClick = () => {
    resend(expiredToken ? { expiredToken } : {});
  };

  const getButtonLabel = (): string => {
    if (isPending) return 'Enviando...';
    if (cooldownSeconds > 0) return `Espera ${cooldownSeconds}s`;
    return 'Reenviar verificación';
  };

  const getAriaLabel = (): string => {
    if (isPending) return 'Enviando email de verificación';
    if (cooldownSeconds > 0)
      return `Reenviar verificación disponible en ${cooldownSeconds} segundos`;
    return 'Reenviar email de verificación';
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={getAriaLabel()}
        aria-disabled={isDisabled}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:hover:shadow-none"
      >
        {isPending ? (
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
          getButtonLabel()
        )}
      </button>

      {/* Success confirmation message */}
      {showSuccess && (
        <p className="mt-2 text-center text-sm text-emerald-400" role="status" aria-live="polite">
          ✓ Email reenviado
        </p>
      )}

      {/* Error message */}
      {error && !showSuccess && (
        <p className="mt-2 text-center text-sm text-red-400" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
