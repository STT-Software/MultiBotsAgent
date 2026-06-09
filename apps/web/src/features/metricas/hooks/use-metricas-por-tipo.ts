'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAgentTypeMetrics } from '../services/metricas.service';
import type { AgentMetricsResponse, AgentTypeFilter, MetricPeriod } from '../types/metricas.types';

interface UseMetricasPorTipoResult {
  data: AgentMetricsResponse | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

/**
 * Consulta las métricas de un tipo de agente para el período dado.
 * Re-fetcha automáticamente cuando cambian `agentType` o `period`.
 * `retry()` fuerza un nuevo fetch sin cambiar los parámetros.
 */
export function useMetricasPorTipo(
  agentType: Exclude<AgentTypeFilter, 'todos'>,
  period: MetricPeriod,
): UseMetricasPorTipoResult {
  const [data, setData]       = useState<AgentMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [tick, setTick]       = useState(0);

  const retry = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchAgentTypeMetrics(agentType, period)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentType, period, tick]);

  return { data, loading, error, retry };
}
