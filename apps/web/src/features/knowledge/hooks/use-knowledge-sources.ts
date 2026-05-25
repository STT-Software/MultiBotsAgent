'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { KnowledgeSource } from '@multibotagents/types';
import { getSourcesByAgent, getSourceStatus, deleteSource, reprocessSource } from '../services';
import { POLLING_INTERVAL_MS } from '../constants';

interface UseKnowledgeSourcesReturn {
  sources: KnowledgeSource[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  handleDelete: (sourceId: string) => Promise<void>;
  handleReprocess: (sourceId: string) => Promise<void>;
}

/**
 * Hook principal para gestión de fuentes de conocimiento.
 * Implementa fetch inicial, polling para fuentes en procesamiento,
 * y operaciones de mutación con actualización optimista.
 */
export function useKnowledgeSources(agentId: string): UseKnowledgeSourcesReturn {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      const data = await getSourcesByAgent(agentId);
      setSources(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar fuentes');
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  // Fetch inicial
  useEffect(() => {
    setIsLoading(true);
    fetchSources();
  }, [fetchSources]);

  // Polling para fuentes en "processing"
  useEffect(() => {
    const hasProcessing = sources.some((s) => s.status === 'processing');

    if (!hasProcessing) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      const processingSources = sources.filter((s) => s.status === 'processing');
      try {
        const updated = await Promise.all(
          processingSources.map((s) => getSourceStatus(s.id)),
        );
        setSources((prev) =>
          prev.map((s) => {
            const match = updated.find((u) => u.id === s.id);
            return match ?? s;
          }),
        );
      } catch {
        // Silencioso — reintenta en el siguiente ciclo
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [sources]);

  const handleDelete = useCallback(async (sourceId: string) => {
    // Actualización optimista
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
    try {
      await deleteSource(sourceId);
    } catch (err) {
      // Revertir en caso de error
      await fetchSources();
      throw err;
    }
  }, [fetchSources]);

  const handleReprocess = useCallback(async (sourceId: string) => {
    // Actualización optimista
    setSources((prev) =>
      prev.map((s) =>
        s.id === sourceId ? { ...s, status: 'processing' as const, progress: 'extracting' as const, fragmentCount: 0, errorReason: undefined } : s,
      ),
    );
    try {
      const updated = await reprocessSource(sourceId);
      setSources((prev) => prev.map((s) => (s.id === sourceId ? updated : s)));
    } catch (err) {
      await fetchSources();
      throw err;
    }
  }, [fetchSources]);

  return {
    sources,
    isLoading,
    error,
    refetch: fetchSources,
    handleDelete,
    handleReprocess,
  };
}
