"use client";

import { useCallback, useEffect, useState } from "react";

import { Agente, AgentesMetrics } from "../types/agentes.types";
import { fetchAgentes, fetchAgentesMetrics } from "../services/agentes.service";

interface UseAgentesListReturn {
  loading: boolean;
  error: string | null;
  agentes: Agente[];
  metrics: AgentesMetrics | null;
  retry: () => void;
}

export function useAgentesList(): UseAgentesListReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [metrics, setMetrics] = useState<AgentesMetrics | null>(null);

  const loadAgentes = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAgentes([]);

    try {
      const [response, metricsData] = await Promise.all([
        fetchAgentes(),
        fetchAgentesMetrics(),
      ]);
      const sorted = [...response.data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAgentes(sorted);
      setMetrics(metricsData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar agentes";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgentes();
  }, [loadAgentes]);

  const retry = useCallback(() => {
    loadAgentes();
  }, [loadAgentes]);

  return { loading, error, agentes, metrics, retry };
}
