"use client";

import { useCallback, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";

interface InboxMessageInputProps {
  onSend: (content: string) => void;
  sending: boolean;
  disabled: boolean;
}

export function InboxMessageInput({ onSend, sending, disabled }: InboxMessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = content.trim().length > 0 && !sending && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(content.trim());
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, content, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  return (
    <div
      className="flex items-end gap-2 px-4 py-3 shrink-0"
      style={{ borderTop: "1px solid #3c4a41" }}
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Conversación resuelta" : "Escribe un mensaje..."}
        disabled={disabled || sending}
        rows={1}
        className="flex-1 resize-none rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
        style={{
          backgroundColor: "#1a1f1c",
          border: "1.5px solid #3c4a41",
          color: "#dde5dc",
          opacity: disabled ? 0.5 : 1,
        }}
        onFocus={(e) => {
          if (!disabled) e.currentTarget.style.borderColor = "#00bb7a";
        }}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#3c4a41")}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
        style={{
          backgroundColor: canSend ? "#00bb7a" : "#242c27",
          color: canSend ? "#004329" : "#5a6b5e",
          cursor: canSend ? "pointer" : "not-allowed",
        }}
        aria-label="Enviar mensaje"
      >
        {sending ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Send size={16} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
