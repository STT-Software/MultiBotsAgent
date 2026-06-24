"use client";

import { useCallback, useState } from "react";

import { resolveConversation } from "../services/inbox.service";

interface UseResolveConversationReturn {
  isOpen: boolean;
  abrir: () => void;
  cerrar: () => void;
  confirmar: () => Promise<void>;
  resolving: boolean;
  error: string | null;
}

export function useResolveConversation(
  conversationId: string | null,
  onResolved?: () => void
): UseResolveConversationReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const cerrar = useCallback(() => {
    if (resolving) return;
    setIsOpen(false);
    setError(null);
  }, [resolving]);

  const confirmar = useCallback(async () => {
    if (!conversationId) return;

    setResolving(true);
    setError(null);

    try {
      await resolveConversation(conversationId);
      setIsOpen(false);
      onResolved?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al resolver la conversación";
      setError(message);
    } finally {
      setResolving(false);
    }
  }, [conversationId, onResolved]);

  return { isOpen, abrir, cerrar, confirmar, resolving, error };
}
