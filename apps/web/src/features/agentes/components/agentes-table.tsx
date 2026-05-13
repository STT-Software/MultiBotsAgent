import { Agente } from "../types/agentes.types";
import { AgenteRow } from "./agente-row";

interface AgentesTableProps {
  agentes: Agente[];
}

export function AgentesTable({ agentes }: AgentesTableProps) {
  return (
    <div className="w-full rounded-lg overflow-hidden" style={{ backgroundColor: "#1a211c" }}>
      {/* Header */}
      <div
        className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3"
        style={{ backgroundColor: "#242c27" }}
      >
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "#bbcabe" }}
        >
          Nombre
        </span>
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "#bbcabe" }}
        >
          Tipo
        </span>
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "#bbcabe" }}
        >
          Estado
        </span>
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "#bbcabe" }}
        >
          Creado
        </span>
      </div>

      {/* Rows */}
      {agentes.map((agente) => (
        <AgenteRow key={agente.id} agente={agente} />
      ))}
    </div>
  );
}
