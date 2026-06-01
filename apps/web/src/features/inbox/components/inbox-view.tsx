"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

import { ConversationMessage } from "../types/inbox.types";
import { useEscalatedConversations } from "../hooks/use-escalated-conversations";
import { useConversationDetail } from "../hooks/use-conversation-detail";
import { useSendMessage } from "../hooks/use-send-message";
import { useResolveConversation } from "../hooks/use-resolve-conversation";
import { activateMockMode, seedConversations } from "../services/inbox.service";
import { InboxConversationList } from "./inbox-conversation-list";
import { InboxConversationDetail } from "./inbox-conversation-detail";
import { InboxEmptyState } from "./inbox-empty-state";
import { InboxSkeleton } from "./inbox-skeleton";
import { InboxResolveDialog } from "./inbox-resolve-dialog";
import { InboxEventsSummary } from "./inbox-events-summary";

export function InboxView() {
  const { conversations, loading, error, retry, refresh } = useEscalatedConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { conversation, loading: detailLoading } = useConversationDetail(selectedId);
  const [extraMessages, setExtraMessages] = useState<ConversationMessage[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Reset extra messages when selecting a different conversation
  useEffect(() => {
    setExtraMessages([]);
  }, [selectedId]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleMessageSent = useCallback((msg: ConversationMessage) => {
    setExtraMessages((prev) => [...prev, msg]);
  }, []);

  const handleSimulatedReply = useCallback((msg: ConversationMessage) => {
    setExtraMessages((prev) => [...prev, msg]);
  }, []);

  const sendMessage = useSendMessage(selectedId, handleMessageSent, handleSimulatedReply);

  const handleResolved = useCallback(() => {
    setToast("Conversación resuelta. El control fue devuelto al agente.");
    setSelectedId(null);
    refresh();
  }, [refresh]);

  const resolve = useResolveConversation(selectedId, handleResolved);

  // Seleccionar la primera conversación escalada por defecto
  useEffect(() => {
    if (conversations.length > 0 && selectedId === null) {
      const firstEscalated = conversations.find((c) => c.status === "escalated");
      if (firstEscalated) {
        setSelectedId(firstEscalated.id);
      }
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
          <div className="flex items-center gap-3">
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
            <button
              onClick={async () => {
                try { await seedConversations(); refresh(); } catch { activateMockMode(); refresh(); }
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "#1a2f23",
                color: "#7db8f0",
                border: "1px solid #3a5068",
              }}
            >
              Simular chats
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return <InboxEmptyState onSimulate={async () => {
      try { await seedConversations(); refresh(); } catch { activateMockMode(); refresh(); }
    }} />;
  }

  const isResolved = conversation?.status === "resolved";

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] relative overflow-hidden">
      {/* Resumen de eventos */}
      <InboxEventsSummary />

      {/* Layout split */}
      <div className="flex flex-1 overflow-hidden">
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
        onSendMessage={sendMessage.send}
        onSendWithFile={sendMessage.sendWithFile}
        sending={sendMessage.sending}
        isTyping={sendMessage.isTyping}
        isResolved={isResolved}
        onResolve={resolve.abrir}
        extraMessages={extraMessages}
      />

      </div>

      {/* Diálogo de resolución */}
      <InboxResolveDialog
        isOpen={resolve.isOpen}
        resolving={resolve.resolving}
        error={resolve.error}
        onConfirm={resolve.confirmar}
        onCancel={resolve.cerrar}
      />

      {/* Toast de éxito */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg"
          style={{ backgroundColor: "#1a3d2f", border: "1px solid #2d6e5a", color: "#49df9a" }}
        >
          <CheckCircle size={16} aria-hidden="true" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}
