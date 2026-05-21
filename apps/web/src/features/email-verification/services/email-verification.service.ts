import type {
  VerifyEmailResult,
  ResendVerificationResult,
  VerificationError,
  VerificationErrorType,
} from '../types/email-verification.types';

export interface ResendVerificationParams {
  expiredToken?: string;
}

export interface EmailVerificationApiError {
  status: number;
  type: VerificationErrorType;
  message: string;
  retryAfter?: number;
}

/**
 * Verifica un email mediante el token recibido por correo.
 * @param token - Token de verificación (hex 64 chars)
 * @returns VerifyEmailResult en caso de éxito (200)
 * @throws EmailVerificationApiError con detalles del error
 */
export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
  const res = await fetch(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (res.status === 200) {
    return res.json();
  }

  const data = await res.json().catch(() => ({}));

  const error: EmailVerificationApiError = {
    status: res.status,
    type: mapErrorType(data.error),
    message: data.message || getDefaultMessage(res.status, data.error),
  };

  if (data.retryAfter) {
    error.retryAfter = data.retryAfter;
  }

  throw error;
}

/**
 * Reenvía el email de verificación.
 * Puede usarse con un token expirado (desde la página de verificación)
 * o autenticado (desde el panel, usando la cookie de sesión).
 * @param params - Parámetros opcionales (expiredToken)
 * @returns ResendVerificationResult en caso de éxito (200)
 * @throws EmailVerificationApiError con detalles del error
 */
export async function resendVerification(
  params: ResendVerificationParams = {},
): Promise<ResendVerificationResult> {
  const res = await fetch('/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  });

  if (res.status === 200) {
    return res.json();
  }

  const data = await res.json().catch(() => ({}));

  const error: EmailVerificationApiError = {
    status: res.status,
    type: mapErrorType(data.error),
    message: data.message || getDefaultMessage(res.status, data.error),
  };

  if (data.retryAfter) {
    error.retryAfter = data.retryAfter;
  }

  throw error;
}

/**
 * Parsea un error capturado en un VerificationError tipado.
 * Útil para los hooks que consumen este servicio.
 */
export function parseVerificationError(err: unknown): VerificationError {
  if (isEmailVerificationApiError(err)) {
    return {
      type: err.type,
      message: err.message,
      retryAfter: err.retryAfter,
    };
  }

  return {
    type: 'INTERNAL_ERROR',
    message: 'Ocurrió un error inesperado. Por favor intenta más tarde.',
  };
}

function isEmailVerificationApiError(err: unknown): err is EmailVerificationApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    'type' in err &&
    'message' in err
  );
}

function mapErrorType(errorCode: string | undefined): VerificationErrorType {
  switch (errorCode) {
    case 'TOKEN_INVALID':
      return 'TOKEN_INVALID';
    case 'TOKEN_EXPIRED':
      return 'TOKEN_EXPIRED';
    case 'TOKEN_ALREADY_USED':
      return 'TOKEN_ALREADY_USED';
    default:
      return 'INTERNAL_ERROR';
  }
}

function getDefaultMessage(status: number, errorCode?: string): string {
  switch (errorCode) {
    case 'TOKEN_INVALID':
      return 'El link de verificación no es válido.';
    case 'TOKEN_EXPIRED':
      return 'El link de verificación expiró. Solicita uno nuevo.';
    case 'TOKEN_ALREADY_USED':
      return 'El link de verificación ya fue utilizado.';
    case 'ALREADY_VERIFIED':
      return 'Tu email ya está verificado.';
    case 'RESEND_COOLDOWN':
      return 'Debes esperar antes de solicitar otro reenvío.';
    default:
      break;
  }

  switch (status) {
    case 401:
      return 'No tienes autorización para realizar esta acción.';
    case 429:
      return 'Debes esperar antes de solicitar otro reenvío.';
    default:
      return 'Ocurrió un error inesperado. Por favor intenta más tarde.';
  }
}
