"use client";

import { useCallback, useRef, useState } from "react";
import { Send, Loader2, Paperclip } from "lucide-react";
import { InboxFilePreview } from "./inbox-file-preview";

interface InboxMessageInputProps {
  onSend: (content: string) => void;
  onSendWithFile?: (file: File) => void;
  sending: boolean;
  disabled: boolean;
}

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xlsx";

export function InboxMessageInput({ onSend, onSendWithFile, sending, disabled }: InboxMessageInputProps) {
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = (content.trim().length > 0 || selectedFile !== null) && !sending && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;

    if (selectedFile && onSendWithFile) {
      onSendWithFile(selectedFile);
      setSelectedFile(null);
      setContent("");
    } else if (content.trim().length > 0) {
      onSend(content.trim());
      setContent("");
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, content, selectedFile, onSend, onSendWithFile]);

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
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  }, []);

  const handleAttachClick = useCallback(() => {
    if (disabled || sending) return;
    fileInputRef.current?.click();
  }, [disabled, sending]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <div className="flex flex-col shrink-0" style={{ borderTop: "1px solid #3c4a41" }}>
      {/* File preview */}
      {selectedFile && (
        <div className="px-4 pt-3">
          <InboxFilePreview file={selectedFile} onRemove={handleRemoveFile} />
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* Attach button */}
        <button
          type="button"
          onClick={handleAttachClick}
          disabled={disabled || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
          style={{
            color: disabled ? "#5a6b5e" : "#869489",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.backgroundColor = "#242c27";
          }}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          aria-label="Adjuntar archivo"
        >
          <Paperclip size={16} aria-hidden="true" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />

        {/* Textarea */}
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

        {/* Send button */}
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
    </div>
  );
}
