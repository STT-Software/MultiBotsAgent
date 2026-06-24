import type {
  ChangePasswordResponse,
  ChangePasswordErrorResponse,
  ChangePasswordErrorCode,
} from '@multibotagents/types';
import type { ChangePasswordUIError } from '../types';

/** Timeout en milisegundos para la solicitud HTTP (29 segundos). */
const REQUEST_TIMEOUT_MS = 29_000;

/**
 * Realiza la solicitud PATCH /auth/change-password al backend.
 *
 * @param currentPassword - Contraseña actual del usuario
 * @param newPassword - Nueva contraseña que cumple requisitos de seguridad
 * @param accessToken - Token JWT de acceso del usuario autenticado
 * @returns ChangePasswordResponse en caso de éxito (200)
 * @throws ChangePasswordUIError con código, mensaje y reglas fallidas opcionales
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  accessToken: string,
): Promise<ChangePasswordResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch('/auth/change-password', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 200) {
      return res.json() as Promise<ChangePasswordResponse>;
    }

    // Parse error body from backend
    const errorData: ChangePasswordErrorResponse | null = await res
      .json()
      .catch(() => null);

    if (res.status === 401) {
      throw buildUIError('NETWORK_ERROR', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
    }

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const minutes = retryAfter ? Math.ceil(parseInt(retryAfter, 10) / 60) : 15;
      throw buildUIError(
        'RATE_LIMIT_EXCEEDED',
        `Demasiados intentos. Intenta en ${minutes} minutos.`,
      );
    }

    if (res.status === 400 && errorData) {
      throw buildUIError(
        errorData.code,
        getMessageForCode(errorData.code, errorData.error),
        errorData.failedRules,
      );
    }

    // 5xx or unexpected status
    throw buildUIError(
      'SERVER_ERROR',
      'Error interno. Intenta más tarde.',
    );
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // Re-throw if already a ChangePasswordUIError
    if (isUIError(error)) {
      throw error;
    }

    // AbortController timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw buildUIError('TIMEOUT', 'La operación tardó demasiado. Intenta nuevamente.');
    }

    // Network error (no connection)
    if (error instanceof TypeError) {
      throw buildUIError('NETWORK_ERROR', 'Sin conexión. Verifica tu conectividad.');
    }

    // Unknown error — wrap as server error
    throw buildUIError('SERVER_ERROR', 'Error interno. Intenta más tarde.');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUIError(
  code: ChangePasswordUIError['code'],
  message: string,
  failedRules?: ChangePasswordUIError['failedRules'],
): ChangePasswordUIError {
  const error: ChangePasswordUIError = { code, message };
  if (failedRules && failedRules.length > 0) {
    error.failedRules = failedRules;
  }
  return error;
}

function getMessageForCode(code: ChangePasswordErrorCode, fallback: string): string {
  const messages: Record<ChangePasswordErrorCode, string> = {
    INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.',
    SAME_AS_CURRENT: 'La nueva contraseña debe ser diferente a la actual.',
    VALIDATION_FAILED: 'La nueva contraseña no cumple los requisitos de seguridad.',
    USER_NOT_FOUND: 'No se pudo procesar la solicitud.',
    RATE_LIMIT_EXCEEDED: 'Demasiados intentos. Intenta en unos minutos.',
    SERVER_ERROR: 'Error interno. Intenta más tarde.',
  };
  return messages[code] || fallback || 'Error desconocido.';
}

function isUIError(error: unknown): error is ChangePasswordUIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as ChangePasswordUIError).code === 'string' &&
    typeof (error as ChangePasswordUIError).message === 'string'
  );
}
