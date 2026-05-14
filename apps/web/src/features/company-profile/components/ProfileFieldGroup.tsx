'use client';

import { Field } from '@/components/ui/Field';
import { ChevronDown } from '@/components/ui/ChevronDown';

// ─── Style helpers ───────────────────────────────────────────────────────────

function inputClasses(hasError: boolean) {
  return [
    'w-full rounded-lg border bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-200 sm:px-4 sm:py-3',
    hasError
      ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
      : 'border-gray-700 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50',
  ].join(' ');
}

function selectClasses(hasError: boolean) {
  return [
    'w-full appearance-none rounded-lg border bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 outline-none transition-all duration-200 sm:px-4 sm:py-3',
    hasError
      ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
      : 'border-gray-700 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50',
  ].join(' ');
}

// ─── Input Field ─────────────────────────────────────────────────────────────

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  autoComplete?: string;
}

export function InputField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  placeholder,
  type = 'text',
  disabled,
  autoComplete,
}: InputFieldProps) {
  return (
    <Field id={id} label={label} required={required} error={error}>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`${inputClasses(!!error)} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        aria-required={required ? 'true' : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </Field>
  );
}

// ─── Select Field ────────────────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  onBlur,
  error,
  required,
  placeholder,
}: SelectFieldProps) {
  return (
    <Field id={id} label={label} required={required} error={error}>
      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={selectClasses(!!error) + (value === '' ? ' text-gray-500' : '')}
          aria-required={required ? 'true' : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown />
      </div>
    </Field>
  );
}

// ─── Barrel ──────────────────────────────────────────────────────────────────

export function ProfileFieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}
