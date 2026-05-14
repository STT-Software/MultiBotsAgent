'use client';

import type { PasswordRuleResult } from '@multibotagents/types';

export interface PasswordRequirementsProps {
  /** Lista de resultados de validación de reglas de contraseña. */
  rules: PasswordRuleResult[];
}

/**
 * Muestra la lista de requisitos de contraseña con indicadores visuales
 * que se actualizan en tiempo real según el estado de validación.
 */
export function PasswordRequirements({ rules }: PasswordRequirementsProps) {
  return (
    <ul
      className="space-y-1.5 text-sm"
      aria-live="polite"
      aria-label="Requisitos de contraseña"
    >
      {rules.map((ruleResult) => (
        <li
          key={ruleResult.rule}
          className="flex items-center gap-2"
          aria-label={`${ruleResult.message}: ${ruleResult.passed ? 'cumplido' : 'no cumplido'}`}
        >
          {ruleResult.passed ? (
            <svg
              className="h-4 w-4 shrink-0 text-green-400"
              aria-hidden="true"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 shrink-0 text-red-400"
              aria-hidden="true"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className={ruleResult.passed ? 'text-green-400' : 'text-gray-400'}>
            {ruleResult.message}
          </span>
        </li>
      ))}
    </ul>
  );
}
