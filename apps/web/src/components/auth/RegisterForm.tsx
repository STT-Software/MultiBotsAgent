'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CompanySize,
  ServiceCategory,
  ReferralSource,
} from '@multibotagents/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'CO', name: 'Colombia', phoneCode: '+57' },
  { code: 'MX', name: 'México', phoneCode: '+52' },
  { code: 'AR', name: 'Argentina', phoneCode: '+54' },
  { code: 'CL', name: 'Chile', phoneCode: '+56' },
  { code: 'PE', name: 'Perú', phoneCode: '+51' },
  { code: 'EC', name: 'Ecuador', phoneCode: '+593' },
  { code: 'VE', name: 'Venezuela', phoneCode: '+58' },
  { code: 'BR', name: 'Brasil', phoneCode: '+55' },
  { code: 'US', name: 'Estados Unidos', phoneCode: '+1' },
  { code: 'ES', name: 'España', phoneCode: '+34' },
  { code: 'PA', name: 'Panamá', phoneCode: '+507' },
  { code: 'CR', name: 'Costa Rica', phoneCode: '+506' },
  { code: 'UY', name: 'Uruguay', phoneCode: '+598' },
  { code: 'DO', name: 'República Dominicana', phoneCode: '+1' },
  { code: 'GT', name: 'Guatemala', phoneCode: '+502' },
  { code: 'BO', name: 'Bolivia', phoneCode: '+591' },
  { code: 'PY', name: 'Paraguay', phoneCode: '+595' },
  { code: 'HN', name: 'Honduras', phoneCode: '+504' },
  { code: 'SV', name: 'El Salvador', phoneCode: '+503' },
  { code: 'NI', name: 'Nicaragua', phoneCode: '+505' },
] as const;

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  [ServiceCategory.CUSTOMER_SUPPORT]: 'Soporte al cliente',
  [ServiceCategory.SALES]: 'Ventas',
  [ServiceCategory.MARKETING]: 'Marketing',
  [ServiceCategory.HEALTHCARE]: 'Salud',
  [ServiceCategory.EDUCATION]: 'Educación',
  [ServiceCategory.REAL_ESTATE]: 'Bienes raíces',
  [ServiceCategory.ECOMMERCE]: 'E-commerce',
  [ServiceCategory.FINANCE]: 'Finanzas',
  [ServiceCategory.HOSPITALITY]: 'Hospitalidad',
  [ServiceCategory.LEGAL]: 'Legal',
  [ServiceCategory.LOGISTICS]: 'Logística',
  [ServiceCategory.OTHER]: 'Otro',
};

const SIZE_LABELS: Record<CompanySize, string> = {
  [CompanySize.ONE]: '1 empleado',
  [CompanySize.TWO_TO_FIVE]: '2-5 empleados',
  [CompanySize.SIX_TO_TEN]: '6-10 empleados',
  [CompanySize.ELEVEN_TO_TWENTY]: '11-20 empleados',
  [CompanySize.TWENTY_PLUS]: '20+ empleados',
};

const REFERRAL_LABELS: Record<ReferralSource, string> = {
  [ReferralSource.YOUTUBE]: 'YouTube',
  [ReferralSource.INSTAGRAM]: 'Instagram',
  [ReferralSource.FACEBOOK]: 'Facebook',
  [ReferralSource.GOOGLE]: 'Google',
  [ReferralSource.REFERRAL]: 'Referido',
  [ReferralSource.OTHER]: 'Otro',
};

const STEPS = [
  { id: 1, label: 'Empresa' },
  { id: 2, label: 'Cuenta' },
  { id: 3, label: 'Verificación' },
] as const;

// ─── Validation helpers ──────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ['Débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
const STRENGTH_COLORS = [
  'bg-red-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-emerald-400',
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  companyName: string;
  email: string;
  password: string;
  country: string;
  category: string;
  size: string;
  phoneCountryCode: string;
  phone: string;
  referralSource: string;
}

interface FormErrors {
  companyName?: string;
  email?: string;
  password?: string;
  country?: string;
  category?: string;
  size?: string;
}

interface TouchedFields {
  companyName: boolean;
  email: boolean;
  password: boolean;
  country: boolean;
  category: boolean;
  size: boolean;
}

type StepId = 1 | 2 | 3;

// ─── Component ───────────────────────────────────────────────────────────────

export function RegisterForm() {
  const router = useRouter();

  const [step, setStep] = useState<StepId>(1);

  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    email: '',
    password: '',
    country: '',
    category: '',
    size: '',
    phoneCountryCode: '+57',
    phone: '',
    referralSource: '',
  });

  const [touched, setTouched] = useState<TouchedFields>({
    companyName: false,
    email: false,
    password: false,
    country: false,
    category: false,
    size: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string> | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [, setAccessToken] = useState<string | null>(null);

  // ─── Validation ──────────────────────────────────────────────────────────

  const errors = useMemo<FormErrors>(() => {
    const e: FormErrors = {};
    if (!formData.companyName.trim()) {
      e.companyName = 'El nombre de empresa es obligatorio';
    }
    if (!formData.email.trim()) {
      e.email = 'El email es obligatorio';
    } else if (!EMAIL_REGEX.test(formData.email)) {
      e.email = 'Formato de email inválido';
    }
    if (!formData.password) {
      e.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 8) {
      e.password = 'Mínimo 8 caracteres';
    } else if (!/[A-Z]/.test(formData.password)) {
      e.password = 'Debe incluir al menos una mayúscula';
    } else if (!/[0-9]/.test(formData.password)) {
      e.password = 'Debe incluir al menos un número';
    }
    if (!formData.country) {
      e.country = 'Selecciona un país';
    }
    if (!formData.category) {
      e.category = 'Selecciona una categoría';
    }
    if (!formData.size) {
      e.size = 'Selecciona el tamaño de empresa';
    }
    return e;
  }, [formData]);

  const step1Valid = !errors.companyName && !errors.country && !errors.category && !errors.size;
  const step2Valid = !errors.email && !errors.password;
  const isFormValid = Object.keys(errors).length === 0;
  const passwordStrength = getPasswordStrength(formData.password);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setServerError(null);
      setServerFieldErrors(null);
      setIsConflict(false);
    },
    [],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched((prev) => {
        if (name in prev) {
          return { ...prev, [name]: true };
        }
        return prev;
      });
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (step === 1) {
      setTouched((prev) => ({
        ...prev,
        companyName: true,
        country: true,
        category: true,
        size: true,
      }));
      if (step1Valid) setStep(2);
    } else if (step === 2) {
      setTouched((prev) => ({ ...prev, email: true, password: true }));
      if (step2Valid) setStep(3);
    }
  }, [step, step1Valid, step2Valid]);

  const handleBack = useCallback(() => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepId) : prev));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Only submit on last step
      if (step !== 3) {
        handleNext();
        return;
      }

      setTouched({
        companyName: true,
        email: true,
        password: true,
        country: true,
        category: true,
        size: true,
      });

      if (!isFormValid) {
        // Jump back to first invalid step
        if (!step1Valid) setStep(1);
        else if (!step2Valid) setStep(2);
        return;
      }

      setServerError(null);
      setServerFieldErrors(null);
      setIsConflict(false);
      setSubmitting(true);

      try {
        const body: Record<string, string> = {
          companyName: formData.companyName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          country: formData.country,
          category: formData.category,
          size: formData.size,
        };

        if (formData.phone.trim()) {
          body.phone = formData.phone.trim();
          body.phoneCountryCode = formData.phoneCountryCode;
        }

        if (formData.referralSource) {
          body.referralSource = formData.referralSource;
        }

        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });

        if (res.status === 201) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setRegistrationSuccess(true);
          // Delay redirect to show success animation
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
          return;
        }

        if (res.status === 400) {
          const data = await res.json();
          if (data.fields && typeof data.fields === 'object') {
            setServerFieldErrors(data.fields);
          } else {
            setServerError(data.message || 'Los datos enviados son inválidos. Revisa el formulario.');
          }
        } else if (res.status === 403) {
          setServerError('El challenge de seguridad no fue superado. Intenta nuevamente.');
        } else if (res.status === 409) {
          setServerError('Ya existe una cuenta con este email.');
          setIsConflict(true);
          setStep(2); // Email is on step 2
        } else {
          setServerError('Ocurrió un error inesperado. Por favor intenta más tarde.');
        }
      } catch {
        setServerError('Error de conexión. Verifica tu red e intenta nuevamente.');
      } finally {
        setSubmitting(false);
      }
    },
    [step, isFormValid, step1Valid, step2Valid, formData, router, handleNext],
  );

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const fieldError = (field: keyof FormErrors): string | undefined => {
    if (touched[field] && errors[field]) return errors[field];
    if (serverFieldErrors?.[field]) return serverFieldErrors[field];
    return undefined;
  };

  const inputClasses = (field: keyof FormErrors) => {
    const hasError = fieldError(field);
    return [
      'w-full rounded-lg border bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-200 sm:px-4 sm:py-3',
      hasError
        ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
        : 'border-gray-700 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50',
    ].join(' ');
  };

  const selectClasses = (field: keyof FormErrors) => {
    const hasError = fieldError(field);
    return [
      'w-full appearance-none rounded-lg border bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 outline-none transition-all duration-200 sm:px-4 sm:py-3',
      hasError
        ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
        : 'border-gray-700 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50',
    ].join(' ');
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  // Success state — show celebration animation before redirect
  if (registrationSuccess) {
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
            ¡Cuenta creada exitosamente!
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
      aria-label="Formulario de registro empresarial"
    >
      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <p>
            {serverError}
            {isConflict && (
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
      <StepIndicator currentStep={step} />

      {/* Step content wrapper with consistent height */}
      <div key={step} className="animate-step-in space-y-4 sm:space-y-5">
        {step === 1 && (
          <>
            {/* Company Name */}
            <Field
              id="companyName"
              label="Nombre de empresa"
              required
              error={fieldError('companyName')}
            >
              <input
                id="companyName"
                name="companyName"
                type="text"
                autoComplete="organization"
                value={formData.companyName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ingresa el nombre de tu empresa"
                className={inputClasses('companyName')}
                aria-required="true"
                aria-invalid={!!fieldError('companyName')}
                aria-describedby={fieldError('companyName') ? 'companyName-error' : undefined}
              />
            </Field>

            {/* Country */}
            <Field id="country" label="País" required error={fieldError('country')}>
              <div className="relative">
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={selectClasses('country') + (formData.country === '' ? ' text-gray-500' : '')}
                  aria-required="true"
                  aria-invalid={!!fieldError('country')}
                  aria-describedby={fieldError('country') ? 'country-error' : undefined}
                >
                  <option value="" disabled>
                    Selecciona tu país
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </Field>

            {/* Category */}
            <Field
              id="category"
              label="Categoría de servicios"
              required
              error={fieldError('category')}
            >
              <div className="relative">
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={
                    selectClasses('category') + (formData.category === '' ? ' text-gray-500' : '')
                  }
                  aria-required="true"
                  aria-invalid={!!fieldError('category')}
                  aria-describedby={fieldError('category') ? 'category-error' : undefined}
                >
                  <option value="" disabled>
                    Selecciona la categoría principal
                  </option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </Field>

            {/* Company Size */}
            <Field id="size" label="Tamaño de empresa" required error={fieldError('size')}>
              <div className="relative">
                <select
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={selectClasses('size') + (formData.size === '' ? ' text-gray-500' : '')}
                  aria-required="true"
                  aria-invalid={!!fieldError('size')}
                  aria-describedby={fieldError('size') ? 'size-error' : undefined}
                >
                  <option value="" disabled>
                    Selecciona el tamaño de tu empresa
                  </option>
                  {Object.entries(SIZE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
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
            <Field id="password" label="Contraseña" required error={fieldError('password')}>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Crea una contraseña segura"
                  className={inputClasses('password') + ' pr-12'}
                  aria-required="true"
                  aria-invalid={!!fieldError('password')}
                  aria-describedby="password-strength password-error"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
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
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M10 4C5 4 2.5 10 2.5 10s2.5 6 7.5 6 7.5-6 7.5-6-2.5-6-7.5-6z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </div>
              {formData.password.length > 0 && (
                <div id="password-strength" className="space-y-1.5 pt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={[
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          i < passwordStrength ? STRENGTH_COLORS[passwordStrength] : 'bg-gray-700',
                        ].join(' ')}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Fortaleza de la contraseña:{' '}
                    <span className="font-medium">{STRENGTH_LABELS[passwordStrength]}</span>
                  </p>
                </div>
              )}
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            {/* Phone (optional) */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                Teléfono <span className="text-gray-500">(opcional)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative w-24 shrink-0 sm:w-28">
                  <select
                    id="phoneCountryCode"
                    name="phoneCountryCode"
                    value={formData.phoneCountryCode}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-lg border border-gray-700 bg-[#0d1117]/80 backdrop-blur-sm px-2 py-2.5 text-sm text-gray-100 outline-none transition-all duration-200 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 sm:px-3 sm:py-3"
                    aria-label="Código de país del teléfono"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.phoneCode}>
                        {c.phoneCode}
                      </option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="56 1234 5678"
                  className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-200 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 sm:px-4 sm:py-3"
                />
              </div>
            </div>

            {/* Referral Source (optional) */}
            <div className="space-y-1.5">
              <label
                htmlFor="referralSource"
                className="block text-sm font-medium text-gray-300"
              >
                ¿Cómo nos conociste? <span className="text-gray-500">(opcional)</span>
              </label>
              <div className="relative">
                <select
                  id="referralSource"
                  name="referralSource"
                  value={formData.referralSource}
                  onChange={handleChange}
                  className={
                    'w-full appearance-none rounded-lg border border-gray-700 bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm outline-none transition-all duration-200 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 sm:px-4 sm:py-3' +
                    (formData.referralSource === '' ? ' text-gray-500' : ' text-gray-100')
                  }
                >
                  <option value="">Selecciona una opción</option>
                  {Object.entries(REFERRAL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </div>

            {/* CAPTCHA */}
            <div
              className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-gray-600 bg-[#0d1117]/80 backdrop-blur-sm px-3 py-3 sm:px-4"
              aria-label="Verificación CAPTCHA"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-gray-500">
                <div className="h-3 w-3 rounded-sm bg-gray-600" />
              </div>
              <span className="text-sm text-gray-300">No soy un robot</span>
              <span className="ml-auto text-[10px] text-gray-500">reCAPTCHA</span>
            </div>
          </>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-1">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border border-gray-700 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors duration-200 hover:border-gray-600 hover:bg-white/5 sm:py-3"
          >
            Atrás
          </button>
        )}
        <button
          type="submit"
          disabled={
            (step === 1 && !step1Valid && hasTouchedStep1(touched)) ||
            (step === 2 && !step2Valid && hasTouchedStep2(touched)) ||
            (step === 3 && (!isFormValid || submitting))
          }
          className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:hover:shadow-none sm:py-3"
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
              Registrando...
            </span>
          ) : step === 3 ? (
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

// ─── Utility helpers ─────────────────────────────────────────────────────────

function hasTouchedStep1(t: TouchedFields): boolean {
  return t.companyName || t.country || t.category || t.size;
}

function hasTouchedStep2(t: TouchedFields): boolean {
  return t.email || t.password;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: StepId }) {
  return (
    <div
      className="flex items-center justify-between gap-2"
      aria-label="Progreso del registro"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={3}
    >
      {STEPS.map((s, idx) => {
        const isActive = s.id === currentStep;
        const isCompleted = s.id < currentStep;
        return (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 items-center gap-2">
              <div
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300',
                  isCompleted
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : isActive
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-gray-700 bg-transparent text-gray-500',
                ].join(' ')}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 7l4 4 6-7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  s.id
                )}
              </div>
              <span
                className={[
                  'hidden text-xs font-medium transition-colors duration-300 sm:inline',
                  isActive || isCompleted ? 'text-gray-200' : 'text-gray-500',
                ].join(' ')}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  'h-px flex-1 transition-colors duration-300',
                  isCompleted ? 'bg-emerald-500' : 'bg-gray-700',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
        <p id={`${id}-error`} role="alert" className="animate-error-in text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function ChevronDown() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
