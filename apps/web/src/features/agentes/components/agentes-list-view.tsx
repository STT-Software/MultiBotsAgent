"use client";

import { Plus, CheckCircle } from "lucide-react";
import Link from "next/link";

import { useAgentesList } from "../hooks/use-agentes-list";
import { useEliminarAgente } from "../hooks/use-eliminar-agente";
import { AgentesListSkeleton } from "./agentes-list-skeleton";
import { AgentesListError } from "./agentes-list-error";
import { AgentesEmptyState } from "./agentes-empty-state";
import { AgentesTable } from "./agentes-table";
import { AgentesMetricsCards } from "./agentes-metrics-cards";
import { EliminarAgenteDialog } from "./eliminar-agente-dialog";

export function AgentesListView() {
  const { loading, error, agentes, metrics, retry } = useAgentesList();
  const eliminar = useEliminarAgente(() => {
    retry();
  });
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#dde5dc" }}>
            Agentes Inteligentes
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "#bbcabe" }}>
            Orquestación y gestión de modelos inteligentes en tiempo real.
          </p>
        </div>
        <Link
          href="/agentes/crear"
          className="inline-flex h-9 items-center gap-2 rounded-md px-4 text-xs font-semibold transition-all hover:bg-[#00bb7a]"
          style={{ backgroundColor: "#00bb7a", color: "#004329" }}
          aria-label="Crear nuevo agente"
        >
          <Plus size={14} aria-hidden="true" />
          Crear agente
        </Link>
      </div>

      {/* Metrics cards - only show when we have data */}
      {!loading && !error && metrics && (
        <AgentesMetricsCards metrics={metrics} />
      )}

      {/* Content states */}
      {loading && <AgentesListSkeleton />}
      {error && <AgentesListError onRetry={retry} error={error} />}
      {!loading && !error && agentes.length === 0 && <AgentesEmptyState />}
      {!loading && !error && agentes.length > 0 && (
        <AgentesTable agentes={agentes} onEliminar={eliminar.abrir} />
      )}

      {/* Toast de éxito */}
      {eliminar.success && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg"
          style={{ backgroundColor: "#1a3d2f", border: "1px solid #2d6e5a", color: "#49df9a" }}
        >
          <CheckCircle size={16} aria-hidden="true" />
          <span className="text-sm font-medium">Agente eliminado exitosamente</span>
        </div>
      )}

      {/* Diálogo de confirmación */}
      <EliminarAgenteDialog
        isOpen={eliminar.isOpen}
        agente={eliminar.agenteSeleccionado}
        deleting={eliminar.deleting}
        error={eliminar.error}
        onConfirm={eliminar.confirmar}
        onCancel={eliminar.cerrar}
      />
    </div>
  );
}
