/**
 * Tipos para el flujo de recuperación de contraseña.
 * Define DTOs de request/response y códigos de error.
 */

import type { PasswordRule } from "./password-validation.types";

// ─── DTOs de Request ─────────────────────────────────────────────────────────

/** DTO del request de solicitud de reset. */
export interface ForgotPasswordDto {
  email: string;
}

/** DTO del request de reset de contraseña. */
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

/** Response genérico de forgot-password (siempre el mismo). */
export interface ForgotPasswordResponse {
  message: string;
}

/** Response exitoso de reset-password. */
export interface ResetPasswordResponse {
  success: true;
  message: string;
}

/** Response de error de reset-password. */
export interface ResetPasswordErrorResponse {
  error: string;
  code: ResetPasswordErrorCode;
  failedRules?: PasswordRule[];
}

// ─── Códigos de Error ────────────────────────────────────────────────────────

/** Códigos de error del reset de contraseña. */
export type ResetPasswordErrorCode =
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "TOKEN_ALREADY_USED"
  | "VALIDATION_FAILED"
  | "USER_NOT_FOUND"
  | "SERVER_ERROR";
