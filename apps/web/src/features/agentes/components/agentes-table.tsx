import { Agente } from "../types/agentes.types";
import { AgenteRow } from "./agente-row";

interface AgentesTableProps {
  agentes: Agente[];
  onEliminar: (agente: Agente) => void;
}

export function AgentesTable({ agentes, onEliminar }: AgentesTableProps) {
  return (
    <div
      className="w-full rounded-lg overflow-hidden border"
      style={{ backgroundColor: "#1a211c", borderColor: "#3c4a41" }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3"
        style={{ borderBottom: "1px solid #3c4a41" }}
      >
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Nombre del Agente
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Tipo / Misión
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Estado
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Vencimiento / Release
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Acciones
        </span>
      </div>

      {/* Rows */}
      {agentes.map((agente) => (
        <AgenteRow key={agente.id} agente={agente} onEliminar={onEliminar} />
      ))}
    </div>
  );
}
