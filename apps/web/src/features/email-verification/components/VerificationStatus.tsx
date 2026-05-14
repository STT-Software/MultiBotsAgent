'use client';

import { useState, useEffect, useRef } from 'react';

import type { VerifyEmailResult, VerificationError } from '../types/email-verification.types';

const REDIRECT_COUNTDOWN_SECONDS = 3;

interface VerificationStatusProps {
  isPending: boolean;
  result: VerifyEmailResult | null;
  error: VerificationError | null;
  onRetry?: () => void;
  onResend?: () => void;
}

/**
 * Displays the current verification status to the user.
 * States: loading, success (with countdown), TOKEN_INVALID, TOKEN_EXPIRED,
 * TOKEN_ALREADY_USED, INTERNAL_ERROR.
 */
export function VerificationStatus({
  isPending,
  result,
  error,
  onRetry,
  onResend,
}: VerificationStatusProps) {
  if (isPending) {
    return <LoadingState />;
  }

  if (result?.verified) {
    return <SuccessState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} onResend={onResend} />;
  }

  return null;
}

function LoadingState() {
  return (
    <div
      className="flex w-full flex-col items-center justify-center space-y-4 py-12"
      role="status"
      aria-label="Verificando email"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-emerald-500" />
      <p className="text-sm text-gray-400">Verificando tu email...</p>
    </div>
  );
}

function SuccessState() {
  const [countdown, setCountdown] = useState(REDIRECT_COUNTDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center justify-center space-y-6 py-12 animate-fade-in">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-success-ring" />
        <svg
          className="h-12 w-12 text-emerald-400"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          ¡Email verificado!
        </h2>
        <p className="text-sm text-gray-400">
          Redirigiendo en {countdown} segundo{countdown !== 1 ? 's' : ''}...
        </p>
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-gray-800">
        <div className="h-full animate-progress-bar rounded-full bg-emerald-500" />
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: VerificationError;
  onRetry?: () => void;
  onResend?: () => void;
}

function ErrorState({ error, onRetry, onResend }: ErrorStateProps) {
  switch (error.type) {
    case 'TOKEN_INVALID':
      return <TokenInvalidState />;
    case 'TOKEN_EXPIRED':
      return <TokenExpiredState onResend={onResend} />;
    case 'TOKEN_ALREADY_USED':
      return <TokenAlreadyUsedState />;
    case 'INTERNAL_ERROR':
      return <InternalErrorState onRetry={onRetry} />;
    default:
      return <InternalErrorState onRetry={onRetry} />;
  }
}

function TokenInvalidState() {
  return (
    <div
      className="flex w-full flex-col items-center justify-center space-y-4 py-12"
      role="alert"
    >
      <ErrorIcon />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          El link no es válido
        </h2>
        <p className="text-sm text-gray-400">
          El enlace de verificación no es válido. Verifica que hayas copiado la URL completa.
        </p>
      </div>
    </div>
  );
}

interface TokenExpiredStateProps {
  onResend?: () => void;
}

function TokenExpiredState({ onResend }: TokenExpiredStateProps) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center space-y-4 py-12"
      role="alert"
    >
      <ClockIcon />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          El link expiró
        </h2>
        <p className="text-sm text-gray-400">
          El enlace de verificación ha expirado. Solicita uno nuevo para verificar tu email.
        </p>
      </div>
      {onResend && (
        <button
          type="button"
          onClick={onResend}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Reenviar email de verificación
        </button>
      )}
    </div>
  );
}

function TokenAlreadyUsedState() {
  return (
    <div
      className="flex w-full flex-col items-center justify-center space-y-4 py-12"
      role="alert"
    >
      <InfoIcon />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          El link ya fue utilizado
        </h2>
        <p className="text-sm text-gray-400">
          Este enlace de verificación ya fue utilizado. Si ya verificaste tu email, puedes iniciar sesión.
        </p>
      </div>
    </div>
  );
}

interface InternalErrorStateProps {
  onRetry?: () => void;
}

function InternalErrorState({ onRetry }: InternalErrorStateProps) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center space-y-4 py-12"
      role="alert"
    >
      <WarningIcon />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          Error temporal
        </h2>
        <p className="text-sm text-gray-400">
          Ocurrió un error al verificar tu email. Por favor, intenta de nuevo.
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

// --- Icons ---

function ErrorIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
      <svg
        className="h-8 w-8 text-red-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path
          d="M15 9l-6 6M9 9l6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function ClockIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
      <svg
        className="h-8 w-8 text-yellow-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 6v6l4 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function InfoIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
      <svg
        className="h-8 w-8 text-blue-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 16v-4M12 8h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function WarningIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
      <svg
        className="h-8 w-8 text-orange-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v4M12 17h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
