import { fetchWithAuth } from '@/lib/auth';
import type {
  IntegrationProvider,
  IntegrationSummary,
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

/**
 * Lista las integraciones de la empresa.
 * GET /integrations con Bearer token.
 *
 * Devuelve `IntegrationSummary[]` (sin tokens ni campos sensibles, R7.4).
 */
export async function getIntegrations(): Promise<IntegrationSummary[]> {
  const res = await fetchWithAuth('/integrations', { method: 'GET' });

  if (res.ok) {
    return (await res.json()) as IntegrationSummary[];
  }

  throw await buildServiceError(res);
}

/**
 * Desconecta una integración por id.
 * DELETE /integrations/:id con Bearer token.
 *
 * Devuelve el `IntegrationSummary` ya en estado `disconnected` (R6).
 */
export async function disconnectIntegration(
  integrationId: string,
): Promise<IntegrationSummary> {
  const res = await fetchWithAuth(
    `/integrations/${encodeURIComponent(integrationId)}`,
    { method: 'DELETE' },
  );

  if (res.ok) {
    return (await res.json()) as IntegrationSummary;
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
