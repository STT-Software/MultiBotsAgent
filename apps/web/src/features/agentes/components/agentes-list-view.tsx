"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { useAgentesList } from "../hooks/use-agentes-list";
import { AgentesListSkeleton } from "./agentes-list-skeleton";
import { AgentesListError } from "./agentes-list-error";
import { AgentesEmptyState } from "./agentes-empty-state";
import { AgentesTable } from "./agentes-table";

export function AgentesListView() {
  const { loading, error, agentes, retry } = useAgentesList();

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-[32px] font-bold"
          style={{ color: "#dde5dc" }}
        >
          Agentes
        </h1>
        <Link
          href="/agentes/crear"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ backgroundColor: "#00bb7a", color: "#004329" }}
          aria-label="Crear nuevo agente"
        >
          <Plus size={16} aria-hidden="true" />
          Crear agente
        </Link>
      </div>

      {/* Content */}
      {loading && <AgentesListSkeleton />}
      {error && <AgentesListError onRetry={retry} />}
      {!loading && !error && agentes.length === 0 && <AgentesEmptyState />}
      {!loading && !error && agentes.length > 0 && (
        <AgentesTable agentes={agentes} />
      )}
    </div>
  );
}
