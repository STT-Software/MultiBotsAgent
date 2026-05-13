import Link from "next/link";

import { Agente } from "../types/agentes.types";
import { AgenteTipoBadge } from "./agente-tipo-badge";
import { AgenteEstadoBadge } from "./agente-estado-badge";

interface AgenteRowProps {
  agente: Agente;
}

export function AgenteRow({ agente }: AgenteRowProps) {
  const formattedDate = new Date(agente.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/agentes/${agente.id}`}
      className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-4 border-b transition-colors cursor-pointer"
      style={{ borderColor: "#3c4a41" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = "#242c27")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = "transparent")
      }
    >
      <span className="text-sm font-semibold" style={{ color: "#dde5dc" }}>
        {agente.nombre}
      </span>
      <AgenteTipoBadge tipo={agente.tipo} />
      <AgenteEstadoBadge estado={agente.estado} />
      <span className="text-[13px]" style={{ color: "#bbcabe" }}>
        {formattedDate}
      </span>
    </Link>
  );
}
