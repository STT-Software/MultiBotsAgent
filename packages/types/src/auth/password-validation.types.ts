/**
 * Tipos de validación de contraseña.
 * Define las reglas de seguridad y sus resultados de evaluación.
 * Consumidos tanto por el frontend (validación en tiempo real) como por el backend.
 */

// ─── Reglas ──────────────────────────────────────────────────────────────────

/** Identificadores de cada regla de contraseña. */
export type PasswordRule =
  | "MIN_LENGTH"
  | "MAX_LENGTH"
  | "UPPERCASE"
  | "LOWERCASE"
  | "DIGIT"
  | "SPECIAL_CHAR";

// ─── Resultados ──────────────────────────────────────────────────────────────

/** Resultado de validación de una regla individual. */
export interface PasswordRuleResult {
  /** Identificador de la regla evaluada. */
  rule: PasswordRule;
  /** Indica si la regla se cumple. */
  passed: boolean;
  /** Mensaje descriptivo del resultado (ej: "Mínimo 8 caracteres"). */
  message: string;
}

/** Resultado completo de validación de contraseña. */
export interface PasswordValidationResult {
  /** true si y solo si todas las reglas individuales tienen passed: true. */
  isValid: boolean;
  /** Resultado de cada regla evaluada (siempre 6 elementos). */
  rules: PasswordRuleResult[];
}
