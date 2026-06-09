import { AuthStore, refreshAccessToken } from '@/lib/auth';
import type { AgentMetricsResponse, GeneralMetricsResponse, MetricPeriod } from '../types/metricas.types';

/**
 * Fetch autenticado que va directamente al backend de métricas.
 *
 * Por qué no usamos fetchWithAuth con URL absoluta:
 * - fetchWithAuth maneja el refresh con rutas relativas (/auth/refresh).
 * - Cuando la URL es absoluta (http://localhost:3001/...), el 401 intenta
 *   refrescar correctamente, pero el backend está en otro origen y las cookies
 *   httpOnly no se envían sin credentials: 'include'.
 * - Esta función usa el mismo AuthStore y refreshAccessToken de fetchWithAuth,
 *   pero apunta la URL de la API directamente al backend.
 */
async function fetchMetricas(path: string): Promise<Response> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const url = `${apiBase}${path}`;

  const makeRequest = (token: string | null) =>
    fetch(url, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  let res = await makeRequest(AuthStore.getToken());

  // Si 401, intentar refresh una vez
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await makeRequest(AuthStore.getToken());
    }
  }

  return res;
}

/**
 * Consulta las métricas generales de la empresa para el período dado.
 */
export async function fetchGeneralMetrics(
  period: MetricPeriod,
): Promise<GeneralMetricsResponse> {
  const res = await fetchMetricas(`/metricas/generales?period=${period}`);
  if (!res.ok) {
    throw new Error(`Error al obtener métricas generales: ${res.status}`);
  }
  return res.json() as Promise<GeneralMetricsResponse>;
}

/**
 * Consulta las métricas específicas de un tipo de agente para el período dado.
 */
export async function fetchAgentTypeMetrics(
  agentType: 'rag' | 'cotizador' | 'agendamiento',
  period: MetricPeriod,
): Promise<AgentMetricsResponse> {
  const res = await fetchMetricas(`/metricas/tipo/${agentType}?period=${period}`);
  if (!res.ok) {
    throw new Error(`Error al obtener métricas del agente ${agentType}: ${res.status}`);
  }
  return res.json() as Promise<AgentMetricsResponse>;
}
