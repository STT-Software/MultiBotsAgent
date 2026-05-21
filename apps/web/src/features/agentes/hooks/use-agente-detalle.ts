"use client";

import { useCallback, useEffect, useState } from "react";

import { Agente } from "../types/agentes.types";
import { fetchAgenteById } from "../services/agentes.service";

interface UseAgenteDetalleReturn {
  agente: Agente | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  retry: () => void;
}

export function useAgenteDetalle(id: string): UseAgenteDetalleReturn {
  const [agente, setAgente] = useState<Agente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadAgente = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const result = await fetchAgenteById(id);
      if (result === null) {
        setNotFound(true);
      } else {
        setAgente(result);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar el agente";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAgente();
  }, [loadAgente]);

  const retry = useCallback(() => {
    loadAgente();
  }, [loadAgente]);

  return { agente, loading, error, notFound, retry };
}
