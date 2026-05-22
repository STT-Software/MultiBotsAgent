"use client";

import { useEffect, useState } from "react";

import { useEscalatedConversations } from "../hooks/use-escalated-conversations";
import { useConversationDetail } from "../hooks/use-conversation-detail";
import { InboxConversationList } from "./inbox-conversation-list";
import { InboxConversationDetail } from "./inbox-conversation-detail";
import { InboxEmptyState } from "./inbox-empty-state";
import { InboxSkeleton } from "./inbox-skeleton";

export function InboxView() {
  const { conversations, loading, error, retry } = useEscalatedConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { conversation, loading: detailLoading } = useConversationDetail(selectedId);

  // Seleccionar la primera conversación por defecto cuando se cargan los datos
  useEffect(() => {
    if (conversations.length > 0 && selectedId === null) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  if (loading) {
    return <InboxSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm" style={{ color: "#f87171" }}>
            {error}
          </p>
          <button
            onClick={retry}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "#1a2f23",
              color: "#00bb7a",
              border: "1px solid #3c4a41",
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return <InboxEmptyState />;
  }

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div
        className="w-[350px] shrink-0 flex flex-col"
        style={{ borderRight: "1px solid #3c4a41" }}
      >
        <InboxConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Detalle */}
      <InboxConversationDetail
        conversation={conversation}
        loading={detailLoading}
      />
    </div>
  );
}
