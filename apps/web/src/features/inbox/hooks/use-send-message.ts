"use client";

import { useCallback, useRef, useState } from "react";

import { ConversationMessage } from "../types/inbox.types";
import { sendOperatorMessage, SIMULATE_USER_REPLIES, getRandomSimulatedReply } from "../services/inbox.service";

interface UseSendMessageReturn {
  send: (content: string) => Promise<void>;
  sending: boolean;
  error: string | null;
  isTyping: boolean;
}

export function useSendMessage(
  conversationId: string | null,
  onMessageSent?: (msg: ConversationMessage) => void,
  onSimulatedReply?: (msg: ConversationMessage) => void
): UseSendMessageReturn {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const replyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const send = useCallback(
    async (content: string) => {
      if (!conversationId) return;

      setSending(true);
      setError(null);

      try {
        const message = await sendOperatorMessage({
          conversationId,
          content,
          type: "text",
        });
        onMessageSent?.(message);

        // Simulación de respuesta del usuario
        if (SIMULATE_USER_REPLIES) {
          const typingDelay = 2000 + Math.random() * 2000; // 2-4 segundos
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(true);
            const replyDelay = 1000 + Math.random() * 1000; // 1-2 segundos
            replyTimeoutRef.current = setTimeout(() => {
              setIsTyping(false);
              const simulatedMsg: ConversationMessage = {
                id: `sim-${Date.now()}`,
                sender: "user",
                content: getRandomSimulatedReply(),
                timestamp: new Date().toISOString(),
                type: "text",
              };
              onSimulatedReply?.(simulatedMsg);
            }, replyDelay);
          }, typingDelay);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al enviar el mensaje";
        setError(message);
      } finally {
        setSending(false);
      }
    },
    [conversationId, onMessageSent, onSimulatedReply]
  );

  return { send, sending, error, isTyping };
}
