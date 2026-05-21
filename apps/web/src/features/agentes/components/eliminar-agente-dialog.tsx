"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Agente } from "../types/agentes.types";

interface EliminarAgenteDialogProps {
  isOpen: boolean;
  agente: Agente | null;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EliminarAgenteDialog({
  isOpen,
  agente,
  deleting,
  error,
  onConfirm,
  onCancel,
}: EliminarAgenteDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap básico: enfocar el botón cancelar al abrir
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, deleting, onCancel]);

  if (!isOpen || !agente) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eliminar-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={deleting ? undefined : onCancel}
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
            style={{ backgroundColor: "#2d1a1a", border: "1px solid #5c2a2a" }}
          >
            <AlertTriangle size={20} style={{ color: "#f87171" }} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2
              id="eliminar-dialog-title"
              className="text-sm font-semibold"
              style={{ color: "#e8f0ea" }}
            >
              Eliminar agente
            </h2>
            <p className="text-xs" style={{ color: "#869489" }}>
              ¿Estás seguro de que deseas eliminar el agente{" "}
              <span className="font-semibold" style={{ color: "#dde5dc" }}>
                {agente.nombre}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        {/* Error message */}
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
            disabled={deleting}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "#242c27",
              color: "#bbcabe",
              border: "1px solid #3c4a41",
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: deleting ? "#5c2a2a" : "#dc2626",
              color: "#ffffff",
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
