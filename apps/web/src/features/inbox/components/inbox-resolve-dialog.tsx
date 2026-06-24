"use client";

import { useEffect, useRef } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

interface InboxResolveDialogProps {
  isOpen: boolean;
  resolving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InboxResolveDialog({
  isOpen,
  resolving,
  error,
  onConfirm,
  onCancel,
}: InboxResolveDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !resolving) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, resolving, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolve-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={resolving ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative z-10 flex w-full max-w-md flex-col gap-5 rounded-xl p-6"
        style={{
          backgroundColor: "#1a211c",
          border: "1px solid #3c4a41",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#1a3d2f", border: "1px solid #2d6e5a" }}
          >
            <CheckCircle size={20} style={{ color: "#49df9a" }} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2
              id="resolve-dialog-title"
              className="text-sm font-semibold"
              style={{ color: "#e8f0ea" }}
            >
              Resolver conversación
            </h2>
            <p className="text-xs" style={{ color: "#869489" }}>
              ¿Marcar esta conversación como resuelta? El control volverá al agente.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 rounded-md px-3 py-2" style={{ backgroundColor: "#2d1a1a" }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={resolving}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "#242c27",
              color: "#bbcabe",
              border: "1px solid #3c4a41",
              cursor: resolving ? "not-allowed" : "pointer",
              opacity: resolving ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={resolving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: resolving ? "#1a3d2f" : "#00bb7a",
              color: resolving ? "#49df9a" : "#004329",
              cursor: resolving ? "not-allowed" : "pointer",
            }}
          >
            {resolving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {resolving ? "Resolviendo..." : "Resolver"}
          </button>
        </div>
      </div>
    </div>
  );
}
