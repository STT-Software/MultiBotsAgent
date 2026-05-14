"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { useAgentesList } from "../hooks/use-agentes-list";
import { AgentesListSkeleton } from "./agentes-list-skeleton";
import { AgentesListError } from "./agentes-list-error";
import { AgentesEmptyState } from "./agentes-empty-state";
import { AgentesTable } from "./agentes-table";
import { AgentesMetricsCards } from "./agentes-metrics-cards";

export function AgentesListView() {
  const { loading, error, agentes, metrics, retry } = useAgentesList();

  return (
    <div className="flex min-h-full flex-col">
      {/* Main content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Subheader */}
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "#bbcabe" }}>
            Orquestación y gestión de modelos inteligentes en tiempo real.
          </p>
          <Link
            href="/agentes/crear"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{ backgroundColor: "#00bb7a", color: "#004329" }}
            aria-label="Crear nuevo agente"
          >
            <Plus size={16} aria-hidden="true" />
            Crear agente
          </Link>
        </div>

        {/* Metrics cards - only show when we have data */}
        {!loading && !error && metrics && (
          <AgentesMetricsCards metrics={metrics} />
        )}

        {/* Content states */}
        {loading && <AgentesListSkeleton />}
        {error && <AgentesListError onRetry={retry} />}
        {!loading && !error && agentes.length === 0 && <AgentesEmptyState />}
        {!loading && !error && agentes.length > 0 && (
          <AgentesTable agentes={agentes} />
        )}
      </div>

      {/* Footer */}
      <footer
        className="flex items-center justify-between border-t px-6 py-4"
        style={{ borderColor: "#3c4a41" }}
      >
        <span
          className="text-xs"
          style={{ color: "#869489" }}
        >
          © 2026 Obsidian AI Orchestrator
        </span>
        <div className="flex items-center gap-4">
          <a href="#" className="text-xs transition-colors hover:underline" style={{ color: "#869489" }}>
            Privacy Policy
          </a>
          <a href="#" className="text-xs transition-colors hover:underline" style={{ color: "#869489" }}>
            Terms of Service
          </a>
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#869489" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#49df9a" }} aria-hidden="true" />
            API Status
          </span>
        </div>
      </footer>
    </div>
  );
}
