import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { PasswordStrength } from './PasswordStrength';
import type { FormData, FormErrors, TouchedFields } from '../types';

interface AccountStepProps {
  formData: FormData;
  errors: FormErrors;
  touched: TouchedFields;
  serverFieldErrors: Record<string, string> | null;
  showPassword: boolean;
  passwordStrength: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onTogglePassword: () => void;
}

export function AccountStep({
  formData,
  errors,
  touched,
  serverFieldErrors,
  showPassword,
  passwordStrength,
  onChange,
  onBlur,
  onTogglePassword,
}: AccountStepProps) {
  const fieldError = (field: keyof FormErrors): string | undefined => {
    if (touched[field] && errors[field]) return errors[field];
    if (serverFieldErrors?.[field]) return serverFieldErrors[field];
    return undefined;
  };

  return (
    <>
      {/* Email */}
      <Field id="email" label="Email" required error={fieldError('email')}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={formData.email}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="ejemplo@empresa.com"
          hasError={!!fieldError('email')}
          aria-required="true"
          aria-invalid={!!fieldError('email')}
          aria-describedby={fieldError('email') ? 'email-error' : undefined}
        />
      </Field>

      {/* Password */}
      <Field id="password" label="Contraseña" required error={fieldError('password')}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={formData.password}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Crea una contraseña segura"
            hasError={!!fieldError('password')}
            className="pr-12"
            aria-required="true"
            aria-invalid={!!fieldError('password')}
            aria-describedby="password-strength password-error"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200 z-10"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <PasswordStrength strength={passwordStrength} visible={formData.password.length > 0} />
      </Field>
    </>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

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

// EyeIcon is defined below but was never imported/referenced properly or was used:
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
