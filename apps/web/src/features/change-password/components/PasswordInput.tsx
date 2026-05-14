'use client';

import { useState } from 'react';

export interface PasswordInputProps {
  /** Visible label text associated with the input. */
  label: string;
  /** Controlled input value. */
  value: string;
  /** Change handler that receives the new string value. */
  onChange: (value: string) => void;
  /** Inline error message displayed below the input. */
  error?: string;
  /** Unique id for label/input association and ARIA references. */
  id: string;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Whether the input is disabled. */
  disabled?: boolean;
  /** HTML autocomplete attribute (e.g. 'current-password', 'new-password'). */
  autoComplete?: string;
}

/**
 * Password input with toggle visibility button.
 * Displays as type="password" by default with an eye icon to reveal text.
 * Supports inline error messages and proper ARIA attributes for accessibility.
 */
export function PasswordInput({
  label,
  value,
  onChange,
  error,
  id,
  placeholder,
  disabled = false,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={inputClasses(!!error) + ' pr-12'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="animate-error-in text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Style helpers ───────────────────────────────────────────────────────────

function inputClasses(hasError: boolean) {
  return [
    'w-full rounded-lg border bg-[#0d1117]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-200 sm:px-4 sm:py-3',
    hasError
      ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
      : 'border-gray-700 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50',
  ].join(' ');
}

// ─── Icons ───────────────────────────────────────────────────────────────────

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
