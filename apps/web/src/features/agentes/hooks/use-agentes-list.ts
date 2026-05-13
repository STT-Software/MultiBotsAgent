"use client";

import { useCallback, useEffect, useState } from "react";

import { Agente } from "../types/agentes.types";
import { fetchAgentes } from "../services/agentes.service";

interface UseAgentesListReturn {
  loading: boolean;
  error: string | null;
  agentes: Agente[];
  retry: () => void;
}

export function useAgentesList(): UseAgentesListReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentes, setAgentes] = useState<Agente[]>([]);

  const loadAgentes = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAgentes([]);

    try {
      const response = await fetchAgentes();
      const sorted = [...response.data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAgentes(sorted);
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

  return { loading, error, agentes, retry };
}
