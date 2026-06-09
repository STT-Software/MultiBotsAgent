import { fetchWithAuth } from '@/lib/auth';
import type { AgentMetricsResponse, GeneralMetricsResponse, MetricPeriod } from '../types/metricas.types';

/**
 * Base URL para las llamadas al backend de métricas.
 * Usa la URL directa del backend para evitar conflictos con las rutas de Next.js.
 * En desarrollo: http://localhost:3001
 * En producción: NEXT_PUBLIC_API_URL
 */
function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001');
}

/**
 * Consulta las métricas generales de la empresa para el período dado.
 */
export async function fetchGeneralMetrics(
  period: MetricPeriod,
): Promise<GeneralMetricsResponse> {
  const res = await fetchWithAuth(`${getApiBase()}/metricas/generales?period=${period}`);
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
  const res = await fetchWithAuth(`${getApiBase()}/metricas/tipo/${agentType}?period=${period}`);
  if (!res.ok) {
    throw new Error(`Error al obtener métricas del agente ${agentType}: ${res.status}`);
  }
  return res.json() as Promise<AgentMetricsResponse>;
}
