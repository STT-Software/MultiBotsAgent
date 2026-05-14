/**
 * Validador de contraseña compartido entre frontend y backend.
 * Lógica pura sin dependencias de I/O.
 *
 * Responsabilidades:
 * - Validar que una contraseña cumpla las 6 reglas de seguridad
 * - Sanitizar input de contraseña (eliminar caracteres de control, recortar espacios)
 *
 * Consumido por:
 * - Frontend: validación en tiempo real (usePasswordValidation hook)
 * - Backend: validación en el servicio de cambio de contraseña
 */
import type {
  PasswordRule,
  PasswordRuleResult,
  PasswordValidationResult,
} from "@multibotagents/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const DIGIT_REGEX = /\d/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/;

/**
 * Regex para caracteres de control Unicode:
 * - U+0000–U+001F (C0 controls)
 * - U+007F–U+009F (DEL + C1 controls)
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F]/g;

// ─── Validator ───────────────────────────────────────────────────────────────

/**
 * Valida una contraseña contra las 6 reglas de seguridad.
 *
 * Siempre retorna exactamente 6 reglas evaluadas, independientemente del input.
 * `isValid` es `true` si y solo si todas las reglas individuales tienen `passed: true`.
 *
 * @param password - Contraseña a validar (sin sanitizar)
 * @returns Resultado de validación con las 6 reglas evaluadas
 *
 * @example
 * ```typescript
 * const result = validatePassword("MyP@ss1!");
 * // result.isValid === true
 * // result.rules.length === 6
 * ```
 */
export function validatePassword(password: string): PasswordValidationResult {
  const rules: PasswordRuleResult[] = [
    {
      rule: "MIN_LENGTH" as PasswordRule,
      passed: password.length >= MIN_LENGTH,
      message: `Mínimo ${MIN_LENGTH} caracteres`,
    },
    {
      rule: "MAX_LENGTH" as PasswordRule,
      passed: password.length <= MAX_LENGTH,
      message: `Máximo ${MAX_LENGTH} caracteres`,
    },
    {
      rule: "UPPERCASE" as PasswordRule,
      passed: UPPERCASE_REGEX.test(password),
      message: "Al menos una letra mayúscula",
    },
    {
      rule: "LOWERCASE" as PasswordRule,
      passed: LOWERCASE_REGEX.test(password),
      message: "Al menos una letra minúscula",
    },
    {
      rule: "DIGIT" as PasswordRule,
      passed: DIGIT_REGEX.test(password),
      message: "Al menos un número",
    },
    {
      rule: "SPECIAL_CHAR" as PasswordRule,
      passed: SPECIAL_CHAR_REGEX.test(password),
      message: "Al menos un carácter especial",
    },
  ];

  return {
    isValid: rules.every((r) => r.passed),
    rules,
  };
}

// ─── Match Validation ────────────────────────────────────────────────────────

/**
 * Valida que la nueva contraseña y su confirmación coincidan.
 *
 * @param newPassword - Nueva contraseña ingresada
 * @param confirmation - Confirmación de la nueva contraseña
 * @returns `true` si ambas cadenas son idénticas, `false` en caso contrario
 *
 * @example
 * ```typescript
 * validatePasswordMatch("MyP@ss1!", "MyP@ss1!"); // true
 * validatePasswordMatch("MyP@ss1!", "Different"); // false
 * ```
 */
export function validatePasswordMatch(
  newPassword: string,
  confirmation: string,
): boolean {
  return newPassword === confirmation;
}

// ─── Sanitization ────────────────────────────────────────────────────────────

/**
 * Sanitiza el input de contraseña eliminando caracteres de control y recortando espacios.
 *
 * Operaciones realizadas:
 * 1. Elimina caracteres de control Unicode (U+0000–U+001F, U+007F–U+009F)
 * 2. Recorta espacios en blanco al inicio y al final (trim)
 *
 * @param password - Contraseña en bruto del input del usuario
 * @returns Contraseña sanitizada
 *
 * @example
 * ```typescript
 * sanitizePasswordInput("  hello\x00world  "); // "helloworld"
 * sanitizePasswordInput("\t pass \n");          // "pass"
 * ```
 */
export function sanitizePasswordInput(password: string): string {
  return password.replace(CONTROL_CHARS_REGEX, "").trim();
}
