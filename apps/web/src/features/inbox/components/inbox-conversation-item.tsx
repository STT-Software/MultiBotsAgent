"use client";

import { EscalatedConversation } from "../types/inbox.types";
import { InboxEscalationBadge } from "./inbox-escalation-badge";
import { InboxUnassignedBadge } from "./inbox-unassigned-badge";
import { useWaitTimer } from "../hooks/use-wait-timer";
import { motion } from "motion/react";

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
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors relative cursor-pointer overflow-hidden border-b border-gray-800 bg-transparent"
    >
      {/* Active highlight background */}
      {isSelected && (
        <motion.div
          layoutId="selectedConversationBg"
          className="absolute inset-0 bg-[#242c27] -z-10"
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
        />
      )}

      {/* Left accent bar when selected */}
      {isSelected && (
        <motion.span
          layoutId="selectedConversationLine"
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500"
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
        />
      )}

      {/* Avatar */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold bg-gray-900 border border-gray-800 text-gray-300"
      >
        {conversation.userId.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold truncate text-gray-200">
            {conversation.userId}
          </span>
          <span
            className="text-[10px] shrink-0 font-medium"
            style={{ color: isResolved ? "#10b981" : conversation.status === "unassigned" ? "#f87171" : isUrgent ? "#f87171" : "#869489" }}
          >
            {isResolved ? "Resuelta" : conversation.status === "unassigned" ? "Sin agente" : timeLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">
            vía {conversation.agentName}
          </span>
        </div>

        <InboxEscalationBadge type={conversation.escalationType} />
        {conversation.status === "unassigned" && <InboxUnassignedBadge />}

        <span className="text-[11px] truncate text-gray-400">
          {conversation.reason}
        </span>
      </div>
    </motion.button>
  );
}
