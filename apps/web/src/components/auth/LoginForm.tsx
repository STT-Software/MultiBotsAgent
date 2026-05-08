'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthStore } from '@/lib/auth';

// ─── Validation helpers ──────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Types ───────────────────────────────────────────────────────────────────

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
}

interface LoginTouchedFields {
  email: boolean;
  password: boolean;
}

type LoginErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'COMPANY_PENDING_DELETION'
  | 'SESSION_REPLACED';

interface ServerErrorState {
  code: LoginErrorCode;
  message: string;
  deletionDate?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LoginForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [touched, setTouched] = useState<LoginTouchedFields>({
    email: false,
    password: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<ServerErrorState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);

  // ─── Validation ──────────────────────────────────────────────────────────

  const errors = useMemo<LoginFormErrors>(() => {
    const e: LoginFormErrors = {};
    if (!formData.email.trim()) {
      e.email = 'El email es obligatorio';
    } else if (!EMAIL_REGEX.test(formData.email)) {
      e.email = 'Formato de email inválido';
    }
    if (!formData.password) {
      e.password = 'La contraseña es obligatoria';
    }
    return e;
  }, [formData]);

  const isFormValid = Object.keys(errors).length === 0;

  // ─── Rate Limit Countdown ────────────────────────────────────────────────

  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setServerError(null);
    },
    [],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setTouched({ email: true, password: true });

      if (!isFormValid) return;

      setSubmitting(true);
      setServerError(null);
      setRateLimitCountdown(null);

      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          }),
        });

        if (res.status === 200) {
          const data = await res.json();
          AuthStore.setToken(data.accessToken);
          setLoginSuccess(true);
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
          return;
        }

        const errorData = await res.json();

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10);
          setRateLimitCountdown(retryAfter);
          setServerError({
            code: 'RATE_LIMIT_EXCEEDED',
            message: errorData.error?.message || 'Demasiados intentos.',
          });
        } else if (res.status === 403 && errorData.error?.code === 'COMPANY_PENDING_DELETION') {
          setServerError({
            code: 'COMPANY_PENDING_DELETION',
            message: errorData.error.message,
            deletionDate: errorData.error.deletionDate,
          });
        } else {
          setServerError({
            code: errorData.error?.code || 'INVALID_CREDENTIALS',
            message: errorData.error?.message || 'Email o contraseña incorrectos',
          });
        }
      } catch {
        setServerError({
          code: 'INVALID_CREDENTIALS',
          message: 'Error de conexión. Verifica tu red e intenta nuevamente.',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [formData, isFormValid, router],
  );

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const fieldError = (field: keyof LoginFormErrors): string | undefined => {
    if (touched[field] && errors[field]) return errors[field];
    return undefined;
  };

  const inputClasses = (field: keyof LoginFormErrors) => {
    const hasError = fieldError(field);
    return [
      'w-full rounded-lg border bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-200 sm:px-4 sm:py-3',
      hasError
        ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
        : 'border-gray-700 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50',
    ].join(' ');
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  // Success state — show celebration animation before redirect
  if (loginSuccess) {
    return (
      <div className="flex w-full flex-col items-center justify-center space-y-6 py-12 animate-fade-in">
        {/* Animated checkmark */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-success-ring rounded-full border-4 border-emerald-500" />
          <svg
            className="h-12 w-12 animate-success-check text-emerald-400"
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
              className="animate-draw-check"
            />
          </svg>
          {/* Particle burst */}
          <div className="absolute inset-0 animate-success-particles">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-emerald-400"
                style={{
                  transform: `rotate(${i * 45}deg) translateY(-32px)`,
                  opacity: 0,
                  animation: `particle-burst 0.6s ease-out ${0.3 + i * 0.05}s forwards`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            ¡Sesión iniciada!
          </h2>
          <p className="text-sm text-gray-400">
            Redirigiendo al panel de administración...
          </p>
        </div>

        {/* Loading bar */}
        <div className="h-1 w-48 overflow-hidden rounded-full bg-gray-800">
          <div className="h-full animate-progress-bar rounded-full bg-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full animate-fade-in space-y-4 sm:space-y-5"
      aria-label="Formulario de inicio de sesión"
    >
      {/* Server error banners */}
      {serverError?.code === 'INVALID_CREDENTIALS' && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertCircleIcon />
          <p>{serverError.message}</p>
        </div>
      )}

      {serverError?.code === 'RATE_LIMIT_EXCEEDED' && (
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
      )}

      {serverError?.code === 'COMPANY_PENDING_DELETION' && (
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
      )}

      {/* Title */}
      <div className="mb-3 sm:mb-4">
        <h2 className="text-[clamp(1.375rem,3vw,1.875rem)] font-bold text-white">
          Iniciar sesión
        </h2>
        <p className="mt-1.5 text-xs text-gray-400 sm:text-sm">
          Accede a tu panel para gestionar tus agentes de IA.
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4 sm:space-y-5">
        {/* Email */}
        <Field id="email" label="Email" required error={fieldError('email')}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="ejemplo@empresa.com"
            className={inputClasses('email')}
            aria-required="true"
            aria-invalid={!!fieldError('email')}
            aria-describedby={fieldError('email') ? 'email-error' : undefined}
          />
        </Field>

        {/* Password */}
        <Field
          id="password"
          label="Contraseña"
          required
          error={fieldError('password')}
        >
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ingresa tu contraseña"
              className={inputClasses('password') + ' pr-12'}
              aria-required="true"
              aria-invalid={!!fieldError('password')}
              aria-describedby={
                fieldError('password') ? 'password-error' : undefined
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200"
              aria-label={
                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting || rateLimitCountdown !== null}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:hover:shadow-none sm:py-3"
      >
        {submitting ? (
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
            Iniciando sesión...
          </span>
        ) : (
          'Iniciar sesión'
        )}
      </button>

      {/* Register link */}
      <p className="text-center text-sm text-gray-400">
        ¿No tienes cuenta?{' '}
        <a
          href="/register"
          className="font-medium text-emerald-400 hover:text-emerald-300"
        >
          Crear cuenta
        </a>
      </p>
    </form>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="animate-error-in text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function AlertCircleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v4M12 16h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4C5 4 2.5 10 2.5 10s2.5 6 7.5 6 7.5-6 7.5-6-2.5-6-7.5-6z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 3l14 14M8.5 8.5a2.12 2.12 0 003 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M4.5 7.5C3.2 8.7 2.5 10 2.5 10s2.5 5 7.5 5c1.1 0 2.1-.3 3-.7M17.5 10s-2.5-5-7.5-5c-.7 0-1.4.1-2 .3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
