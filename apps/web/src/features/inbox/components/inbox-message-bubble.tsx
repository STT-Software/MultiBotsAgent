"use client";

import { ConversationMessage } from "../types/inbox.types";
import { InboxMessageStatus } from "./inbox-message-status";
import { motion } from "motion/react";
import { FileText, Download } from "lucide-react";

interface InboxMessageBubbleProps {
  message: ConversationMessage;
  onRetry?: () => void;
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

export function InboxMessageBubble({ message, onRetry }: InboxMessageBubbleProps) {
  const config = SENDER_CONFIG[message.sender];
  const isImage = message.type === "image" && message.fileUrl;
  const isFile = message.type === "file" && message.fileUrl;

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
        {/* Image attachment */}
        {isImage && (
          <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
            <img
              src={message.fileUrl}
              alt={message.fileName || "Imagen"}
              className="max-w-full max-h-48 rounded object-cover cursor-pointer"
            />
          </a>
        )}

        {/* File attachment */}
        {isFile && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mb-2 rounded px-2.5 py-2 transition-colors"
            style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
          >
            <FileText size={16} style={{ color: "#869489" }} aria-hidden="true" />
            <span className="flex-1 text-xs truncate" style={{ color: "#dde5dc" }}>
              {message.fileName || message.content}
            </span>
            <Download size={14} style={{ color: "#869489" }} aria-hidden="true" />
          </a>
        )}

        {/* Text content (skip if it's just the filename for file messages) */}
        {(!isImage && !isFile) && (
          <p className="text-sm leading-relaxed" style={{ color: config.text }}>
            {message.content}
          </p>
        )}
        {(isImage || isFile) && message.content && message.content !== message.fileName && (
          <p className="text-sm leading-relaxed" style={{ color: config.text }}>
            {message.content}
          </p>
        )}
      </div>

      {/* Time + Status */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500">
          {formatTime(message.timestamp)}
        </span>
        {message.sender === "operator" && message.status && (
          <InboxMessageStatus status={message.status} onRetry={onRetry} />
        )}
      </div>
    </motion.div>
  );
}
