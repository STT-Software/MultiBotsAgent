'use client';

import { useRegisterForm } from '../hooks/useRegisterForm';
import { useRegisterSubmit } from '../hooks/useRegisterSubmit';
import { StepIndicator } from './StepIndicator';
import { CompanyStep } from './CompanyStep';
import { AccountStep } from './AccountStep';
import { VerificationStep } from './VerificationStep';
import { RegistrationSuccess } from './RegistrationSuccess';
import { motion, AnimatePresence } from 'motion/react';

export function RegisterForm() {
  const form = useRegisterForm();
  const submit = useRegisterSubmit({
    formData: form.formData,
    isFormValid: form.isFormValid,
    step1Valid: form.step1Valid,
    step2Valid: form.step2Valid,
    touchAll: form.touchAll,
    setStep: form.setStep,
  });

  // Success state — show email verification message
  if (submit.registrationSuccess) {
    return <RegistrationSuccess email={form.formData.email} />;
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (form.step !== 3) {
      e.preventDefault();
      form.handleNext();
      return;
    }
    submit.handleSubmit(e);
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      noValidate
      className="w-full space-y-4 sm:space-y-5 overflow-hidden"
      aria-label="Formulario de registro empresarial"
    >
      {/* Server error banner */}
      <AnimatePresence>
        {submit.serverError && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <p>
              {submit.serverError}
              {submit.isConflict && (
                <>
                  {' '}
                  <a
                    href="/login"
                    className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
                  >
                    Iniciar sesión
                  </a>
                </>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title */}
      <div className="mb-3 sm:mb-4">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(1.375rem,3vw,1.875rem)] font-bold text-white tracking-tight"
        >
          Crear cuenta empresarial
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-1.5 text-xs text-gray-400 sm:text-sm"
        >
          Únete a miles de empresas que automatizan y escalan con MultiBotAgents.
        </motion.p>
      </div>

      {/* Social Login Buttons (Disabled) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-800/80 bg-gray-900/10 px-3 py-2 text-xs font-medium text-gray-500 cursor-not-allowed opacity-50 transition-all"
        >
          <GoogleIcon className="h-4 w-4 shrink-0 opacity-50" />
          <span>Google</span>
        </button>
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-800/80 bg-gray-900/10 px-3 py-2 text-xs font-medium text-gray-500 cursor-not-allowed opacity-50 transition-all"
        >
          <FacebookIcon className="h-4 w-4 shrink-0 opacity-50" />
          <span>Facebook</span>
        </button>
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-800/80 bg-gray-900/10 px-3 py-2 text-xs font-medium text-gray-500 cursor-not-allowed opacity-50 transition-all"
        >
          <XIcon className="h-4 w-4 shrink-0 opacity-50" />
          <span>X</span>
        </button>
      </div>

      {/* Separator */}
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-gray-800/60"></div>
        <span className="flex-shrink mx-3 text-[10px] text-gray-500 uppercase font-[family-name:var(--font-inter)] tracking-wider">o registrarse con</span>
        <div className="flex-grow border-t border-gray-800/60"></div>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={form.step} />

      {/* Step content with smooth slide animations */}
      <div className="relative py-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={form.step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-4 sm:space-y-5"
          >
            {form.step === 1 && (
              <CompanyStep
                formData={form.formData}
                errors={form.errors}
                touched={form.touched}
                serverFieldErrors={submit.serverFieldErrors}
                onChange={(e) => {
                  form.handleChange(e);
                  submit.clearServerErrors();
                }}
                onBlur={form.handleBlur}
              />
            )}

            {form.step === 2 && (
              <AccountStep
                formData={form.formData}
                errors={form.errors}
                touched={form.touched}
                serverFieldErrors={submit.serverFieldErrors}
                showPassword={form.showPassword}
                passwordStrength={form.passwordStrength}
                onChange={(e) => {
                  form.handleChange(e);
                  submit.clearServerErrors();
                }}
                onBlur={form.handleBlur}
                onTogglePassword={form.togglePassword}
              />
            )}

            {form.step === 3 && (
              <VerificationStep
                formData={form.formData}
                onChange={form.handleChange}
                onCaptchaChange={(token) => {
                  form.setCaptchaToken(token || '');
                }}
                submitting={submit.submitting}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-1">
        {form.step > 1 && (
          <motion.button
            type="button"
            onClick={form.handleBack}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="rounded-lg border border-gray-700 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors duration-200 hover:border-gray-600 hover:bg-white/5 sm:py-3 cursor-pointer"
          >
            Atrás
          </motion.button>
        )}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.01, translateY: -1 }}
          whileTap={{ scale: 0.99 }}
          disabled={
            (form.step === 1 && !form.step1Valid && form.hasTouchedStep1) ||
            (form.step === 2 && !form.step2Valid && form.hasTouchedStep2) ||
            (form.step === 3 && (!form.isFormValid || submit.submitting || !form.formData.captchaToken))
          }
          className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-emerald-600 disabled:hover:to-teal-600 disabled:hover:shadow-none sm:py-3 cursor-pointer"
        >
          {submit.submitting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Registrando...
            </span>
          ) : form.step === 3 ? (
            'Crear cuenta'
          ) : (
            'Siguiente'
          )}
        </motion.button>
      </div>

      {/* Login link */}
      <p className="text-center text-sm text-gray-400">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
          Iniciar sesión
        </a>
      </p>
    </form>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
