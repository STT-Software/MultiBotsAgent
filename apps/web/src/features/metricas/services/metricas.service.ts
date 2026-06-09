import { fetchWithAuth } from '@/lib/auth';
import type { AgentMetricsResponse, GeneralMetricsResponse, MetricPeriod } from '../types/metricas.types';

/**
 * Consulta las métricas generales de la empresa para el período dado.
 * Usa fetchWithAuth — maneja 401 y refresh transparentemente.
 */
export async function fetchGeneralMetrics(
  period: MetricPeriod,
): Promise<GeneralMetricsResponse> {
  const res = await fetchWithAuth(`/metricas/generales?period=${period}`);
  if (!res.ok) {
    throw new Error(`Error al obtener métricas generales: ${res.status}`);
  }
  return res.json() as Promise<GeneralMetricsResponse>;
}

/**
 * Consulta las métricas específicas de un tipo de agente para el período dado.
 * Usa fetchWithAuth — maneja 401 y refresh transparentemente.
 */
export async function fetchAgentTypeMetrics(
  agentType: 'rag' | 'cotizador' | 'agendamiento',
  period: MetricPeriod,
): Promise<AgentMetricsResponse> {
  const res = await fetchWithAuth(`/metricas/tipo/${agentType}?period=${period}`);
  if (!res.ok) {
    throw new Error(`Error al obtener métricas del agente ${agentType}: ${res.status}`);
  }
  return res.json() as Promise<AgentMetricsResponse>;
}
