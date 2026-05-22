import type { ForgotPasswordResponse } from '@multibotagents/types';
import type { ForgotPasswordUIError } from '../types';

/** Timeout en milisegundos para la solicitud HTTP (29 segundos). */
const REQUEST_TIMEOUT_MS = 29_000;

/**
 * Realiza la solicitud POST /auth/forgot-password al backend.
 *
 * @param email - Email del usuario que solicita el reset
 * @returns ForgotPasswordResponse con mensaje genérico
 * @throws ForgotPasswordUIError con código y mensaje
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 200) {
      return res.json() as Promise<ForgotPasswordResponse>;
    }

    if (res.status === 400) {
      throw buildUIError('INVALID_EMAIL', 'El formato del email no es válido.');
    }

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
  code: ForgotPasswordUIError['code'],
  message: string,
): ForgotPasswordUIError {
  return { code, message };
}

function isUIError(error: unknown): error is ForgotPasswordUIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as ForgotPasswordUIError).code === 'string' &&
    typeof (error as ForgotPasswordUIError).message === 'string'
  );
}
