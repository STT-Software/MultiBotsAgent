import { COUNTRIES } from '../constants';
import { CATEGORY_LABELS, SIZE_LABELS } from '../constants';
import { Field } from '@/components/ui/Field';
import { ChevronDown } from '@/components/ui/ChevronDown';
import { Input } from '@/components/ui/Input';
import type { FormData, FormErrors, TouchedFields } from '../types';

interface CompanyStepProps {
  formData: FormData;
  errors: FormErrors;
  touched: TouchedFields;
  serverFieldErrors: Record<string, string> | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function CompanyStep({
  formData,
  errors,
  touched,
  serverFieldErrors,
  onChange,
  onBlur,
}: CompanyStepProps) {
  const fieldError = (field: keyof FormErrors): string | undefined => {
    if (touched[field] && errors[field]) return errors[field];
    if (serverFieldErrors?.[field]) return serverFieldErrors[field];
    return undefined;
  };

  return (
    <>
      {/* Company Name */}
      <Field id="companyName" label="Nombre de empresa" required error={fieldError('companyName')}>
        <Input
          id="companyName"
          name="companyName"
          type="text"
          autoComplete="company-name"
          value={formData.companyName}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="Ingresa el nombre de tu empresa"
          hasError={!!fieldError('companyName')}
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
            onChange={onChange}
            onBlur={onBlur}
            className={selectClasses(!!fieldError('country')) + (formData.country === '' ? ' text-gray-500' : '')}
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
      <Field id="category" label="Categoría de servicios" required error={fieldError('category')}>
        <div className="relative">
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={onChange}
            onBlur={onBlur}
            className={selectClasses(!!fieldError('category')) + (formData.category === '' ? ' text-gray-500' : '')}
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
            onChange={onChange}
            onBlur={onBlur}
            className={selectClasses(!!fieldError('size')) + (formData.size === '' ? ' text-gray-500' : '')}
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
  );
}

// ─── Style helpers ───────────────────────────────────────────────────────────

function selectClasses(hasError: boolean) {
  return [
    'w-full appearance-none rounded-lg border bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 outline-none transition-all duration-200 sm:px-4 sm:py-3',
    hasError
      ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
      : 'border-gray-700 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50',
  ].join(' ');
}
