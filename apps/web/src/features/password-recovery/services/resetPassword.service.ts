import type {
  ResetPasswordResponse,
  ResetPasswordErrorResponse,
  ResetPasswordErrorCode,
} from '@multibotagents/types';
import type { ResetPasswordUIError } from '../types';

/** Timeout en milisegundos para la solicitud HTTP (29 segundos). */
const REQUEST_TIMEOUT_MS = 29_000;

/**
 * Realiza la solicitud POST /auth/reset-password al backend.
 *
 * @param token - Token de restablecimiento recibido por email
 * @param newPassword - Nueva contraseña que cumple requisitos de seguridad
 * @returns ResetPasswordResponse en caso de éxito (200)
 * @throws ResetPasswordUIError con código, mensaje y reglas fallidas opcionales
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 200) {
      return res.json() as Promise<ResetPasswordResponse>;
    }

    // Parse error body from backend
    const errorData: ResetPasswordErrorResponse | null = await res
      .json()
      .catch(() => null);

    if (res.status === 400 && errorData) {
      throw buildUIError(
        errorData.code,
        getMessageForCode(errorData.code, errorData.error),
        errorData.failedRules,
      );
    }

    // 5xx or unexpected status
    throw buildUIError('SERVER_ERROR', 'Error interno. Intenta más tarde.');
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (isUIError(error)) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw buildUIError('TIMEOUT', 'La operación tardó demasiado. Intenta nuevamente.');
    }

    if (error instanceof TypeError) {
      throw buildUIError('NETWORK_ERROR', 'Sin conexión. Verifica tu conectividad.');
    }

    throw buildUIError('SERVER_ERROR', 'Error interno. Intenta más tarde.');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUIError(
  code: ResetPasswordUIError['code'],
  message: string,
  failedRules?: ResetPasswordUIError['failedRules'],
): ResetPasswordUIError {
  const error: ResetPasswordUIError = { code, message };
  if (failedRules && failedRules.length > 0) {
    error.failedRules = failedRules;
  }
  return error;
}

function getMessageForCode(code: ResetPasswordErrorCode, fallback: string): string {
  const messages: Record<ResetPasswordErrorCode, string> = {
    TOKEN_INVALID: 'El enlace es inválido.',
    TOKEN_EXPIRED: 'El enlace ha expirado. Solicita uno nuevo.',
    TOKEN_ALREADY_USED: 'El enlace ya fue utilizado.',
    VALIDATION_FAILED: 'La nueva contraseña no cumple los requisitos de seguridad.',
    USER_NOT_FOUND: 'El enlace es inválido.',
    SERVER_ERROR: 'Error interno. Intenta más tarde.',
  };
  return messages[code] || fallback || 'Error desconocido.';
}

function isUIError(error: unknown): error is ResetPasswordUIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as ResetPasswordUIError).code === 'string' &&
    typeof (error as ResetPasswordUIError).message === 'string'
  );
}
