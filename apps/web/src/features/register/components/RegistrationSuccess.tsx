'use client';

interface RegistrationSuccessProps {
  email?: string;
}

export function RegistrationSuccess({ email }: RegistrationSuccessProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center space-y-6 py-12 animate-fade-in">
      {/* Email icon */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse" />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
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
      </div>

      <div className="text-center space-y-3 max-w-sm">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          Verifica tu email
        </h2>
        <p className="text-sm leading-relaxed text-gray-400">
          Hemos enviado un correo de verificación a
          {email ? (
            <span className="block mt-1 font-medium text-gray-200">{email}</span>
          ) : (
            <span> tu dirección de correo</span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
        </p>
      </div>

      {/* Spam hint */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 text-center">
        <p className="text-xs text-gray-500">
          ¿No lo encuentras? Revisa tu carpeta de spam o correo no deseado.
        </p>
      </div>
    </div>
  );
}
