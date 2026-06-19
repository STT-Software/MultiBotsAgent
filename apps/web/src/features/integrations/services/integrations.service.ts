import { fetchWithAuth } from '@/lib/auth';
import type {
  IntegrationProvider,
  OAuthAuthorizeResponse,
} from '@multibotagents/types';

// ─── Error Types ─────────────────────────────────────────────────────────────

export interface ServiceError {
  status: number;
  message: string;
}

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Inicia el flujo OAuth de un proveedor.
 * GET /integrations/oauth/authorize?provider= con Bearer token.
 *
 * Devuelve la URL de autorización del proveedor a la que el panel debe
 * redirigir al usuario (R1.2).
 */
export async function getAuthorizationUrl(
  provider: IntegrationProvider,
): Promise<string> {
  const res = await fetchWithAuth(
    `/integrations/oauth/authorize?provider=${encodeURIComponent(provider)}`,
    { method: 'GET' },
  );

  if (res.ok) {
    const data = (await res.json()) as OAuthAuthorizeResponse;
    return data.authorizationUrl;
  }

  throw await buildServiceError(res);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function buildServiceError(res: Response): Promise<ServiceError> {
  const data = await res.json().catch(() => ({}));

  let message: string;
  if (res.status === 400) {
    message =
      data.message || 'El proveedor seleccionado no está disponible para conectar.';
  } else {
    message = 'Ocurrió un error inesperado. Por favor intenta más tarde.';
  }

  return { status: res.status, message };
}
