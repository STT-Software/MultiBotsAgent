"use client";

import { useCallback, useEffect, useState } from "react";

import { EscalatedConversation } from "../types/inbox.types";
import { fetchEscalatedConversations, fetchConversationsByStatus } from "../services/inbox.service";

interface UseEscalatedConversationsReturn {
  conversations: EscalatedConversation[];
  loading: boolean;
  error: string | null;
  pendingCount: number;
  retry: () => void;
  refresh: () => void;
}

export function useEscalatedConversations(): UseEscalatedConversationsReturn {
  const [conversations, setConversations] = useState<EscalatedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch both escalated and resolved to allow local filtering
      const [escalatedResponse, resolved, unassigned] = await Promise.all([
        fetchEscalatedConversations(),
        fetchConversationsByStatus("resolved"),
        fetchConversationsByStatus("unassigned"),
      ]);

      const escalated = escalatedResponse.data
        .filter((c) => c.status === "escalated")
        .sort(
          (a, b) =>
            new Date(a.escalatedAt).getTime() - new Date(b.escalatedAt).getTime()
        );

      // Combine all conversations for the list to filter locally
      const all = [...escalated, ...resolved, ...unassigned];
      setConversations(all);
      setPendingCount(escalatedResponse.pendingCount);
    } catch (err) {
      if (!isBackground) {
        const message =
          err instanceof Error ? err.message : "Error al cargar conversaciones escaladas";
        setError(message);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Carga inicial
    load(false);

    // Polling en background cada 4 segundos para mantener la lista actualizada
    const interval = setInterval(() => {
      load(true);
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }, [load]);

  const retry = useCallback(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => {
    load(false);
  }, [load]);

  return { conversations, loading, error, pendingCount, retry, refresh };
}
