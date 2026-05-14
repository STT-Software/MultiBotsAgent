'use client';

import { ResendButton } from './ResendButton';

interface BlockedScreenProps {
  /** The email address where verification was sent */
  email?: string;
}

/**
 * Pantalla de bloqueo mostrada cuando el usuario no ha verificado su email.
 * Muestra un mensaje explicativo, el email al que se envió la verificación
 * y un botón para reenviar el email de verificación.
 *
 * Requisitos: 6.1, 6.2
 */
export function BlockedScreen({ email }: BlockedScreenProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#111318] px-4 py-8"
      role="main"
      aria-labelledby="blocked-title"
    >
      <div className="w-full max-w-md animate-fade-in space-y-6 rounded-2xl border border-gray-800 bg-gray-950/80 p-6 text-center shadow-xl backdrop-blur-sm sm:p-8">
        {/* Email/Lock Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            className="text-emerald-400"
            aria-hidden="true"
          >
            <rect
              x="2"
              y="5"
              width="20"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M2 7l8.165 5.715a3 3 0 003.67 0L22 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          id="blocked-title"
          className="text-xl font-bold text-white sm:text-2xl"
        >
          Verificación de email requerida
        </h1>

        {/* Description */}
        <p className="text-sm leading-relaxed text-gray-400 sm:text-base">
          {email ? (
            <>
              Hemos enviado un email de verificación a{' '}
              <span className="font-medium text-gray-200">{email}</span>.
              Revisa tu bandeja de entrada y haz clic en el link para continuar.
            </>
          ) : (
            <>
              Hemos enviado un email de verificación a tu dirección de correo.
              Revisa tu bandeja de entrada y haz clic en el link para continuar.
            </>
          )}
        </p>

        {/* Resend Button */}
        <ResendButton className="pt-2" />

        {/* Spam hint */}
        <p className="text-xs text-gray-500">
          ¿No encuentras el email? Revisa tu carpeta de spam.
        </p>
      </div>
    </div>
  );
}
