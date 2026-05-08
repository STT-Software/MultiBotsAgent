import type { ServerErrorState } from '../types';

interface LoginErrorBannerProps {
  serverError: ServerErrorState | null;
  rateLimitCountdown: number | null;
}

export function LoginErrorBanner({ serverError, rateLimitCountdown }: LoginErrorBannerProps) {
  if (!serverError) return null;

  if (serverError.code === 'RATE_LIMIT_EXCEEDED') {
    return (
      <div
        role="alert"
        className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
      >
        <AlertCircleIcon />
        <p>
          Demasiados intentos. Intenta de nuevo en{' '}
          <strong>{rateLimitCountdown}s</strong>.
        </p>
      </div>
    );
  }

  if (serverError.code === 'COMPANY_PENDING_DELETION') {
    return (
      <div
        role="alert"
        className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300"
      >
        <p>
          Tu cuenta está programada para eliminación
          {serverError.deletionDate &&
            ` el ${new Date(serverError.deletionDate).toLocaleDateString('es')}`}
          .
        </p>
        <button
          type="button"
          className="mt-2 text-sm font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          Reactivar cuenta
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
    >
      <AlertCircleIcon />
      <p>{serverError.message}</p>
    </div>
  );
}

function AlertCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
