/**
 * Tipos del dominio de cambio de contraseña.
 * Define DTOs, interfaces de respuesta y códigos de error para el endpoint PATCH /auth/change-password.
 */

import type { PasswordRule } from "./password-validation.types";

// ─── DTOs ────────────────────────────────────────────────────────────────────

/** DTO de entrada para el endpoint PATCH /auth/change-password. */
export interface ChangePasswordDto {
  /** Contraseña actual del usuario (verificación de identidad). */
  currentPassword: string;
  /** Nueva contraseña que cumple los requisitos de seguridad. */
  newPassword: string;
}

// ─── Respuestas ──────────────────────────────────────────────────────────────

/** Respuesta exitosa del cambio de contraseña. */
export interface ChangePasswordResponse {
  success: true;
  message: string;
}

/** Respuesta de error con detalle de reglas fallidas. */
export interface ChangePasswordErrorResponse {
  error: string;
  code: ChangePasswordErrorCode;
  /** Lista de reglas de contraseña que no se cumplieron (presente cuando code es VALIDATION_FAILED). */
  failedRules?: PasswordRule[];
}

// ─── Códigos de Error ────────────────────────────────────────────────────────

/** Códigos de error específicos del cambio de contraseña. */
export type ChangePasswordErrorCode =
  | "INVALID_CURRENT_PASSWORD"
  | "SAME_AS_CURRENT"
  | "VALIDATION_FAILED"
  | "USER_NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "SERVER_ERROR";
