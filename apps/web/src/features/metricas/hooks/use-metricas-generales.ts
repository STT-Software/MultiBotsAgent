'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchGeneralMetrics } from '../services/metricas.service';
import type { GeneralMetricsResponse, MetricPeriod } from '../types/metricas.types';

interface UseMetricasGeneralesResult {
  data: GeneralMetricsResponse | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

/**
 * Consulta las métricas generales para el período dado.
 * Re-fetcha automáticamente cuando cambia `period`.
 * `retry()` fuerza un nuevo fetch sin cambiar el período.
 */
export function useMetricasGenerales(period: MetricPeriod): UseMetricasGeneralesResult {
  const [data, setData]       = useState<GeneralMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [tick, setTick]       = useState(0); // incrementar para forzar re-fetch

  const retry = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchGeneralMetrics(period)
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
  }, [period, tick]);

  return { data, loading, error, retry };
}
