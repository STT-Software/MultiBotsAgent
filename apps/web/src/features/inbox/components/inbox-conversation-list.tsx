"use client";

import { useState } from "react";

import { ConversationStatus, EscalatedConversation } from "../types/inbox.types";
import { InboxConversationItem } from "./inbox-conversation-item";

interface InboxConversationListProps {
  conversations: EscalatedConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type TabFilter = "escalated" | "resolved";

export function InboxConversationList({
  conversations,
  selectedId,
  onSelect,
}: InboxConversationListProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>("escalated");

  const filtered = conversations.filter((c) => c.status === activeTab);

  return (
    <div className="flex h-full flex-col">
      {/* Header with tabs */}
      <div className="flex flex-col shrink-0" style={{ borderBottom: "1px solid #3c4a41" }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <h2 className="text-sm font-semibold" style={{ color: "#dde5dc" }}>
            Conversaciones
          </h2>
          <span
            className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
            style={{ backgroundColor: "#00bb7a", color: "#004329" }}
          >
            {filtered.length}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-4 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab("escalated")}
            className="relative px-3 py-2 text-[11px] font-medium transition-colors"
            style={{ color: activeTab === "escalated" ? "#e8f0ea" : "#869489" }}
          >
            Activas
            {activeTab === "escalated" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "#00bb7a" }} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resolved")}
            className="relative px-3 py-2 text-[11px] font-medium transition-colors"
            style={{ color: activeTab === "resolved" ? "#e8f0ea" : "#869489" }}
          >
            Resueltas
            {activeTab === "resolved" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "#00bb7a" }} />
            )}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs" style={{ color: "#869489" }}>
              {activeTab === "escalated"
                ? "No hay conversaciones activas"
                : "No hay conversaciones resueltas"}
            </p>
          </div>
        ) : (
          filtered.map((conversation) => (
            <InboxConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedId === conversation.id}
              onClick={() => onSelect(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
