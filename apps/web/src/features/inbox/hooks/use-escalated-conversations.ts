"use client";

import { useCallback, useEffect, useState } from "react";

import { EscalatedConversation } from "../types/inbox.types";
import { fetchEscalatedConversations } from "../services/inbox.service";

interface UseEscalatedConversationsReturn {
  conversations: EscalatedConversation[];
  loading: boolean;
  error: string | null;
  pendingCount: number;
  retry: () => void;
}

export function useEscalatedConversations(): UseEscalatedConversationsReturn {
  const [conversations, setConversations] = useState<EscalatedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchEscalatedConversations();
      // Filtrar solo escalated y ordenar por escalatedAt ascendente (más antigua primero)
      const escalated = response.data
        .filter((c) => c.status === "escalated")
        .sort(
          (a, b) =>
            new Date(a.escalatedAt).getTime() - new Date(b.escalatedAt).getTime()
        );
      setConversations(escalated);
      setPendingCount(response.pendingCount);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar conversaciones escaladas";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = useCallback(() => {
    load();
  }, [load]);

  return { conversations, loading, error, pendingCount, retry };
}
