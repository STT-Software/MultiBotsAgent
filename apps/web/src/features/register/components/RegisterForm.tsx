'use client';

import { useRegisterForm } from '../hooks/useRegisterForm';
import { useRegisterSubmit } from '../hooks/useRegisterSubmit';
import { StepIndicator } from './StepIndicator';
import { CompanyStep } from './CompanyStep';
import { AccountStep } from './AccountStep';
import { VerificationStep } from './VerificationStep';
import { RegistrationSuccess } from './RegistrationSuccess';

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
      className="w-full animate-fade-in space-y-4 sm:space-y-5"
      aria-label="Formulario de registro empresarial"
    >
      {/* Server error banner */}
      {submit.serverError && (
        <div
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
        </div>
      )}

      {/* Title */}
      <div className="mb-3 sm:mb-4">
        <h2 className="text-[clamp(1.375rem,3vw,1.875rem)] font-bold text-white">
          Crear cuenta empresarial
        </h2>
        <p className="mt-1.5 text-xs text-gray-400 sm:text-sm">
          Únete a miles de empresas que automatizan y escalan con MultiBotAgents.
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={form.step} />

      {/* Step content */}
      <div key={form.step} className="animate-step-in space-y-4 sm:space-y-5">
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
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-1">
        {form.step > 1 && (
          <button
            type="button"
            onClick={form.handleBack}
            className="rounded-lg border border-gray-700 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors duration-200 hover:border-gray-600 hover:bg-white/5 sm:py-3"
          >
            Atrás
          </button>
        )}
        <button
          type="submit"
          disabled={
            (form.step === 1 && !form.step1Valid && form.hasTouchedStep1) ||
            (form.step === 2 && !form.step2Valid && form.hasTouchedStep2) ||
            (form.step === 3 && (!form.isFormValid || submit.submitting))
          }
          className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:hover:shadow-none sm:py-3"
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
        </button>
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
