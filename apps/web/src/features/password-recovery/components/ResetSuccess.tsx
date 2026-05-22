'use client';

import Link from 'next/link';

/**
 * Mensaje de éxito mostrado después de enviar el formulario de forgot-password.
 * Informa al usuario que si el email está registrado, recibirá instrucciones.
 */
export function ResetSuccess() {
  return (
    <div className="space-y-5 text-center" role="status">
      {/* Success icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <svg
          className="h-8 w-8 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">
          Revisa tu email
        </h2>
        <p className="text-sm text-gray-400">
          Si el email está registrado, recibirás un correo con instrucciones para restablecer tu contraseña.
        </p>
        <p className="text-xs text-gray-500">
          El enlace expira en 1 hora. Si no recibes el correo, revisa tu carpeta de spam.
        </p>
      </div>

      {/* Back to login */}
      <Link
        href="/login"
        className="inline-block rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
      >
        Volver a login
      </Link>
    </div>
  );
}
