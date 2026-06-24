"use client";

import { useCallback, useRef, useState } from "react";

import { ConversationMessage } from "../types/inbox.types";
import {
  sendOperatorMessage,
  getUploadUrl,
  uploadFileToS3,
  isMockMode,
  getRandomSimulatedReply,
} from "../services/inbox.service";

interface UseSendMessageReturn {
  send: (content: string) => Promise<void>;
  sendWithFile: (file: File) => Promise<void>;
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

  const triggerSimulatedReply = useCallback(() => {
    if (!isMockMode()) return;

    const typingDelay = 2000 + Math.random() * 2000;
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(true);
      const replyDelay = 1000 + Math.random() * 1000;
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
  }, [onSimulatedReply]);

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
        triggerSimulatedReply();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al enviar el mensaje";
        setError(msg);
      } finally {
        setSending(false);
      }
    },
    [conversationId, onMessageSent, triggerSimulatedReply]
  );

  const sendWithFile = useCallback(
    async (file: File) => {
      if (!conversationId) return;

      setSending(true);
      setError(null);

      try {
        // 1. Get presigned URL
        const { uploadUrl, publicUrl } = await getUploadUrl(
          conversationId,
          file.name,
          file.type,
        );

        // 2. Upload file to S3
        await uploadFileToS3(uploadUrl, file);

        // 3. Send message with file reference
        const type = file.type.startsWith("image/") ? "image" : "file";
        const message = await sendOperatorMessage({
          conversationId,
          content: file.name,
          type,
          fileUrl: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          fileMimeType: file.type,
        });
        onMessageSent?.(message);
        triggerSimulatedReply();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al enviar el archivo";
        setError(msg);
      } finally {
        setSending(false);
      }
    },
    [conversationId, onMessageSent, triggerSimulatedReply]
  );

  return { send, sendWithFile, sending, error, isTyping };
}
