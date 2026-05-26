"use client";

import { ConversationMessage } from "../types/inbox.types";
import { motion } from "motion/react";

interface InboxMessageBubbleProps {
  message: ConversationMessage;
}

const SENDER_CONFIG = {
  user: {
    align: "items-start" as const,
    bg: "#2f3731",
    text: "#dde5dc",
    border: "transparent",
    label: "Usuario",
    labelColor: "#869489",
    xInitial: -10,
  },
  agent: {
    align: "items-end" as const,
    bg: "#1a3a2a",
    text: "#bbcabe",
    border: "#2d6e5a",
    label: "Agente",
    labelColor: "#49df9a",
    xInitial: 10,
  },
  operator: {
    align: "items-end" as const,
    bg: "#1a2a3a",
    text: "#bbcabe",
    border: "#3a5068",
    label: "Operador",
    labelColor: "#7db8f0",
    xInitial: 10,
  },
} as const;

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function InboxMessageBubble({ message }: InboxMessageBubbleProps) {
  const config = SENDER_CONFIG[message.sender];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: config.xInitial, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`flex flex-col ${config.align} gap-1`}
    >
      <span className="text-[10px] font-medium" style={{ color: config.labelColor }}>
        {config.label}
      </span>
      <div
        className="max-w-[75%] rounded-lg px-3.5 py-2.5"
        style={{
          backgroundColor: config.bg,
          border: config.border !== "transparent" ? `1px solid ${config.border}` : "none",
        }}
      >
        <p className="text-sm leading-relaxed" style={{ color: config.text }}>
          {message.content}
        </p>
      </div>
      <span className="text-[10px] text-gray-500">
        {formatTime(message.timestamp)}
      </span>
    </motion.div>
  );
}
