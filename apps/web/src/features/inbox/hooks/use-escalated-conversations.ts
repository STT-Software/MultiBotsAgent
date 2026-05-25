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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch both escalated and resolved to allow local filtering
      const [escalatedResponse, resolved] = await Promise.all([
        fetchEscalatedConversations(),
        fetchConversationsByStatus("resolved"),
      ]);

      const escalated = escalatedResponse.data
        .filter((c) => c.status === "escalated")
        .sort(
          (a, b) =>
            new Date(a.escalatedAt).getTime() - new Date(b.escalatedAt).getTime()
        );

      // Combine all conversations for the list to filter locally
      const all = [...escalated, ...resolved];
      setConversations(all);
      setPendingCount(escalatedResponse.pendingCount);
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

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return { conversations, loading, error, pendingCount, retry, refresh };
}
