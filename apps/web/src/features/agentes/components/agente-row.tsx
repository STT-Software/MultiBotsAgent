import Link from "next/link";
import { MessageSquare, Calculator, Calendar } from "lucide-react";

import { Agente } from "../types/agentes.types";
import { AgenteTipoBadge } from "./agente-tipo-badge";
import { AgenteEstadoBadge } from "./agente-estado-badge";
import { AgenteRowMenu } from "./agente-row-menu";

interface AgenteRowProps {
  agente: Agente;
  onEliminar: (agente: Agente) => void;
}

const TIPO_ICON: Record<Agente["tipo"], React.ReactNode> = {
  rag: <MessageSquare size={18} style={{ color: "#7db8f0" }} aria-hidden="true" />,
  cotizador: <Calculator size={18} style={{ color: "#f0c87d" }} aria-hidden="true" />,
  agendamiento: <Calendar size={18} style={{ color: "#c87df0" }} aria-hidden="true" />,
};

export function AgenteRow({ agente, onEliminar }: AgenteRowProps) {
  return (
    <Link
      href={`/agentes/${agente.id}`}
      className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 transition-colors cursor-pointer"
      style={{ borderBottom: "1px solid #3c4a41" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = "#242c27")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = "transparent")
      }
    >
      {/* Nombre + ID */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{ backgroundColor: "#242c27", border: "1px solid #3c4a41" }}
        >
          {TIPO_ICON[agente.tipo]}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: "#dde5dc" }}>
            {agente.nombre}
          </span>
          <span
            className="text-[11px]"
            style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
          >
            ID: {agente.codigoId}
          </span>
        </div>
      </div>

      {/* Tipo */}
      <AgenteTipoBadge tipo={agente.tipo} />

      {/* Estado */}
      <AgenteEstadoBadge estado={agente.estado} />

      {/* Vencimiento */}
      <span className="text-sm" style={{ color: "#bbcabe" }}>
        {agente.vencimiento}
      </span>

      {/* Acciones */}
      <AgenteRowMenu agente={agente} onEliminar={onEliminar} />
    </Link>
  );
}
