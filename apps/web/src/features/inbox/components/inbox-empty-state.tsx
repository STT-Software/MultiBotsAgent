"use client";

import { Inbox, Zap } from "lucide-react";

interface InboxEmptyStateProps {
  onSimulate?: () => void;
}

export function InboxEmptyState({ onSimulate }: InboxEmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "#1a2f23", border: "1px solid #3c4a41" }}
        >
          <Inbox size={32} style={{ color: "#869489" }} aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold" style={{ color: "#dde5dc" }}>
            No hay conversaciones escaladas
          </h2>
          <p className="text-xs max-w-sm" style={{ color: "#869489" }}>
            Cuando un agente escale una conversación, aparecerá aquí para que puedas atenderla.
          </p>
        </div>
        {onSimulate && (
          <button
            type="button"
            onClick={onSimulate}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors mt-2"
            style={{
              backgroundColor: "#1a2f23",
              color: "#00bb7a",
              border: "1px solid #2d6e5a",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a3d2f")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1a2f23")}
          >
            <Zap size={14} aria-hidden="true" />
            Simular chats
          </button>
        )}
      </div>
    </div>
  );
}
