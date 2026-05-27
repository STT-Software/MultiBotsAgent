"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, Bot, Clock, CheckCircle } from "lucide-react";

import { ConversationMessage, EscalatedConversation } from "../types/inbox.types";
import { InboxMessageBubble } from "./inbox-message-bubble";
import { InboxEscalationBadge } from "./inbox-escalation-badge";
import { InboxMessageInput } from "./inbox-message-input";
import { InboxTypingIndicator } from "./inbox-typing-indicator";

interface InboxConversationDetailProps {
  conversation: EscalatedConversation | null;
  loading: boolean;
  onSendMessage?: (content: string) => void;
  onSendWithFile?: (file: File) => void;
  sending?: boolean;
  isTyping?: boolean;
  isResolved?: boolean;
  onResolve?: () => void;
  extraMessages?: ConversationMessage[];
}

function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  rag: "RAG",
  cotizador: "Cotizador",
  agendamiento: "Agendamiento",
};

export function InboxConversationDetail({
  conversation,
  loading,
  onSendMessage,
  onSendWithFile,
  sending = false,
  isTyping = false,
  isResolved = false,
  onResolve,
  extraMessages = [],
}: InboxConversationDetailProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (conversation && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation, extraMessages.length, isTyping]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6" role="status" aria-label="Cargando conversación">
        <div className="flex flex-col gap-3">
          <div className="h-5 w-48 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-4 w-32 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-4 w-64 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
        </div>
        <div className="flex-1 flex flex-col gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-16 w-3/4 animate-pulse rounded-lg ${i % 2 === 0 ? "" : "self-end"}`}
              style={{ backgroundColor: "#242c27" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <MessageSquare size={32} style={{ color: "#869489" }} aria-hidden="true" />
          <p className="text-sm" style={{ color: "#869489" }}>
            Selecciona una conversación para ver el detalle
          </p>
        </div>
      </div>
    );
  }

  const existingIds = new Set(conversation.messages.map((m) => m.id));
  const uniqueExtra = extraMessages.filter((m) => !existingIds.has(m.id));
  const allMessages = [...conversation.messages, ...uniqueExtra].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header info */}
      <div
        className="flex flex-col gap-3 px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid #3c4a41" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "#dde5dc" }}>
            {conversation.userId}
          </h3>
          <div className="flex items-center gap-2">
            <InboxEscalationBadge type={conversation.escalationType} />
            {!isResolved && onResolve && (
              <button
                type="button"
                onClick={onResolve}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{
                  color: "#49df9a",
                  border: "1px solid #2d6e5a",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a3d2f")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <CheckCircle size={12} aria-hidden="true" />
                Resolver
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#869489" }}>
            <Bot size={12} aria-hidden="true" />
            {conversation.agentName} ({AGENT_TYPE_LABELS[conversation.agentType]})
          </span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#869489" }}>
            <Clock size={12} aria-hidden="true" />
            {formatDateTime(conversation.escalatedAt)}
          </span>
        </div>

        <p className="text-xs" style={{ color: "#bbcabe" }}>
          <span style={{ color: "#869489" }}>Motivo:</span> {conversation.reason}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-col gap-4">
          {allMessages.map((message) => (
            <InboxMessageBubble key={message.id} message={message} />
          ))}
          {isTyping && <InboxTypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {onSendMessage && (
        <InboxMessageInput
          onSend={onSendMessage}
          onSendWithFile={onSendWithFile}
          sending={sending}
          disabled={isResolved}
        />
      )}
    </div>
  );
}
