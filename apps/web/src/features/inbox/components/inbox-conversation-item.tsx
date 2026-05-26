"use client";

import { EscalatedConversation } from "../types/inbox.types";
import { InboxEscalationBadge } from "./inbox-escalation-badge";
import { useWaitTimer } from "../hooks/use-wait-timer";

interface InboxConversationItemProps {
  conversation: EscalatedConversation;
  isSelected: boolean;
  onClick: () => void;
}

export function InboxConversationItem({
  conversation,
  isSelected,
  onClick,
}: InboxConversationItemProps) {
  const { timeLabel, isUrgent } = useWaitTimer(conversation.escalatedAt);
  const isResolved = conversation.status === "resolved";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors relative"
      style={{
        backgroundColor: isSelected ? "#242c27" : "transparent",
        borderBottom: "1px solid #3c4a41",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = "#1a1f1c";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {/* Left accent bar when selected */}
      {isSelected && (
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: "#00bb7a" }}
        />
      )}

      {/* Avatar */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        style={{ backgroundColor: "#1a2f23", color: "#bbcabe", border: "1px solid #3c4a41" }}
      >
        {conversation.userId.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold truncate" style={{ color: "#dde5dc" }}>
            {conversation.userId}
          </span>
          <span
            className="text-[10px] shrink-0 font-medium"
            style={{ color: isResolved ? "#49df9a" : isUrgent ? "#f87171" : "#869489" }}
          >
            {isResolved ? "Resuelta" : timeLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: "#869489" }}>
            vía {conversation.agentName}
          </span>
        </div>

        <InboxEscalationBadge type={conversation.escalationType} />

        <span className="text-[11px] truncate" style={{ color: "#869489" }}>
          {conversation.reason}
        </span>
      </div>
    </button>
  );
}
