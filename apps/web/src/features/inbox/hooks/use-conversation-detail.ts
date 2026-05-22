"use client";

import { useCallback, useEffect, useState } from "react";

import { EscalatedConversation } from "../types/inbox.types";
import { fetchConversationById } from "../services/inbox.service";

interface UseConversationDetailReturn {
  conversation: EscalatedConversation | null;
  loading: boolean;
  error: string | null;
}

export function useConversationDetail(id: string | null): UseConversationDetailReturn {
  const [conversation, setConversation] = useState<EscalatedConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchConversationById(conversationId);
      setConversation(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar la conversación";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id === null) {
      setConversation(null);
      return;
    }
    load(id);
  }, [id, load]);

  return { conversation, loading, error };
}
