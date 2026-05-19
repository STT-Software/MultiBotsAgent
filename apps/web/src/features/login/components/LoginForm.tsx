'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useLoginForm } from '../hooks/useLoginForm';
import { useLoginSubmit } from '../hooks/useLoginSubmit';
import { LoginSuccess } from './LoginSuccess';
import { LoginErrorBanner } from './LoginErrorBanner';
import { Field } from '@/components/ui/Field';

export function LoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get('reset') === 'success';
  const [showResetBanner, setShowResetBanner] = useState(resetSuccess);

  const form = useLoginForm();
  const submit = useLoginSubmit({
    formData: form.formData,
    isFormValid: form.isFormValid,
    touchAll: form.touchAll,
  });

  if (submit.loginSuccess) {
    return <LoginSuccess />;
  }

  const inputClasses = (hasError: boolean) =>
    [
      'w-full rounded-lg border bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-200 sm:px-4 sm:py-3',
      hasError
        ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
        : 'border-gray-700 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50',
    ].join(' ');

  return (
    <form
      onSubmit={(e) => {
        submit.clearServerError();
        submit.handleSubmit(e);
      }}
      noValidate
      className="w-full animate-fade-in space-y-4 sm:space-y-5"
      aria-label="Formulario de inicio de sesión"
    >
      {showResetBanner && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <span>Contraseña restablecida. Inicia sesión con tu nueva contraseña.</span>
          <button
            type="button"
            onClick={() => setShowResetBanner(false)}
            className="ml-auto shrink-0 text-emerald-400 hover:text-emerald-200"
            aria-label="Cerrar mensaje"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      <LoginErrorBanner
        serverError={submit.serverError}
        rateLimitCountdown={submit.rateLimitCountdown}
      />

      {/* Title */}
      <div className="mb-3 sm:mb-4">
        <h2 className="text-[clamp(1.375rem,3vw,1.875rem)] font-bold text-white">
          Iniciar sesión
        </h2>
        <p className="mt-1.5 text-xs text-gray-400 sm:text-sm">
          Accede a tu panel para gestionar tus agentes de IA.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-4 sm:space-y-5">
        <Field id="email" label="Email" required error={form.fieldError('email')}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.formData.email}
            onChange={(e) => { form.handleChange(e); submit.clearServerError(); }}
            onBlur={form.handleBlur}
            placeholder="ejemplo@empresa.com"
            className={inputClasses(!!form.fieldError('email'))}
            aria-required="true"
            aria-invalid={!!form.fieldError('email')}
            aria-describedby={form.fieldError('email') ? 'email-error' : undefined}
          />
        </Field>

        <Field id="password" label="Contraseña" required error={form.fieldError('password')}>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={form.showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.formData.password}
              onChange={(e) => { form.handleChange(e); submit.clearServerError(); }}
              onBlur={form.handleBlur}
              placeholder="Ingresa tu contraseña"
              className={inputClasses(!!form.fieldError('password')) + ' pr-12'}
              aria-required="true"
              aria-invalid={!!form.fieldError('password')}
              aria-describedby={form.fieldError('password') ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={form.togglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200"
              aria-label={form.showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {form.showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submit.submitting || submit.rateLimitCountdown !== null}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:hover:shadow-none sm:py-3"
      >
        {submit.submitting ? (
          <span className="inline-flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Iniciando sesión...
          </span>
        ) : (
          'Iniciar sesión'
        )}
      </button>

      {/* Forgot password link */}
      <p className="text-center text-sm">
        <a href="/forgot-password" className="text-gray-400 hover:text-emerald-300 transition-colors">
          ¿Olvidaste tu contraseña?
        </a>
      </p>

      {/* Register link */}
      <p className="text-center text-sm text-gray-400">
        ¿No tienes cuenta?{' '}
        <a href="/register" className="font-medium text-emerald-400 hover:text-emerald-300">
          Crear cuenta
        </a>
      </p>
    </form>
  );
}

// ─── Icons (privados del componente) ─────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4C5 4 2.5 10 2.5 10s2.5 6 7.5 6 7.5-6 7.5-6-2.5-6-7.5-6z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 3l14 14M8.5 8.5a2.12 2.12 0 003 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 7.5C3.2 8.7 2.5 10 2.5 10s2.5 5 7.5 5c1.1 0 2.1-.3 3-.7M17.5 10s-2.5-5-7.5-5c-.7 0-1.4.1-2 .3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
