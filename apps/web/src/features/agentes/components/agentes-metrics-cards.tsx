import { Activity, Gauge, Coins } from "lucide-react";

import { AgentesMetrics } from "../types/agentes.types";

interface AgentesMetricsCardsProps {
  metrics: AgentesMetrics;
}

export function AgentesMetricsCards({ metrics }: AgentesMetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Agentes Activos */}
      <div
        className="flex flex-col gap-2 rounded-lg border p-5"
        style={{
          backgroundColor: "#1a211c",
          borderColor: "#3c4a41",
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "#bbcabe", fontFamily: "JetBrains Mono, monospace" }}
          >
            Agentes Activos
          </span>
          <Activity size={16} style={{ color: "#49df9a" }} aria-hidden="true" />
        </div>
        <span
          className="text-3xl font-bold"
          style={{ color: "#dde5dc", fontFamily: "Geist, sans-serif" }}
        >
          {metrics.agentesActivos}
        </span>
        <span className="text-xs" style={{ color: "#49df9a" }}>
          ↑ {metrics.cambioSemanal}
        </span>
      </div>

      {/* Latencia Media */}
      <div
        className="flex flex-col gap-2 rounded-lg border p-5"
        style={{
          backgroundColor: "#1a211c",
          borderColor: "#3c4a41",
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "#bbcabe", fontFamily: "JetBrains Mono, monospace" }}
          >
            Latencia Media
          </span>
          <Gauge size={16} style={{ color: "#bbcabe" }} aria-hidden="true" />
        </div>
        <span
          className="text-3xl font-bold"
          style={{ color: "#dde5dc", fontFamily: "Geist, sans-serif" }}
        >
          {metrics.latenciaMedia}
        </span>
        <span className="text-xs" style={{ color: "#bbcabe" }}>
          ● {metrics.latenciaEstado}
        </span>
      </div>

      {/* Token Usage */}
      <div
        className="flex flex-col gap-2 rounded-lg border p-5"
        style={{
          backgroundColor: "#1a211c",
          borderColor: "#3c4a41",
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "#bbcabe", fontFamily: "JetBrains Mono, monospace" }}
          >
            Token Usage
          </span>
          <Coins size={16} style={{ color: "#bbcabe" }} aria-hidden="true" />
        </div>
        <span
          className="text-3xl font-bold"
          style={{ color: "#dde5dc", fontFamily: "Geist, sans-serif" }}
        >
          {metrics.tokenUsage}
        </span>
        <span className="text-xs" style={{ color: "#f0c87d" }}>
          ⚠ {metrics.tokenEstado}
        </span>
      </div>
    </div>
  );
}
