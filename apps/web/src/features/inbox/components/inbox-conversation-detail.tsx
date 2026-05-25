"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, Bot, Clock } from "lucide-react";

import { EscalatedConversation } from "../types/inbox.types";
import { InboxMessageBubble } from "./inbox-message-bubble";
import { InboxEscalationBadge } from "./inbox-escalation-badge";

interface InboxConversationDetailProps {
  conversation: EscalatedConversation | null;
  loading: boolean;
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

export function InboxConversationDetail({ conversation, loading }: InboxConversationDetailProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (conversation && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation]);

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
          <InboxEscalationBadge type={conversation.escalationType} />
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
          {conversation.messages.map((message) => (
            <InboxMessageBubble key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
