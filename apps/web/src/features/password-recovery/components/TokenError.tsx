'use client';

import Link from 'next/link';
import type { TokenErrorType } from '../types';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TokenErrorProps {
  /** Tipo de error de token. */
  type: TokenErrorType;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ERROR_CONFIG: Record<TokenErrorType, { title: string; message: string }> = {
  TOKEN_INVALID: {
    title: 'Enlace inválido',
    message: 'El enlace de restablecimiento no es válido. Es posible que haya sido modificado o que ya no exista.',
  },
  TOKEN_EXPIRED: {
    title: 'Enlace expirado',
    message: 'El enlace de restablecimiento ha expirado. Los enlaces son válidos por 1 hora.',
  },
  TOKEN_ALREADY_USED: {
    title: 'Enlace ya utilizado',
    message: 'Este enlace de restablecimiento ya fue utilizado. Cada enlace solo puede usarse una vez.',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Muestra mensajes de error para tokens inválidos, expirados o ya usados.
 * Incluye un enlace para solicitar un nuevo restablecimiento.
 */
export function TokenError({ type }: TokenErrorProps) {
  const config = ERROR_CONFIG[type];

  return (
    <div className="space-y-5 text-center" role="alert">
      {/* Error icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
        <svg
          className="h-8 w-8 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">
          {config.title}
        </h2>
        <p className="text-sm text-gray-400">
          {config.message}
        </p>
      </div>

      {/* Link to request new reset */}
      <Link
        href="/forgot-password"
        className="inline-block rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
      >
        Solicitar nuevo enlace
      </Link>
    </div>
  );
}
