import { Users } from "lucide-react";
import Link from "next/link";

export function AgentesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <Users size={64} color="#bbcabe" aria-hidden="true" />
      <h2
        className="text-lg font-semibold"
        style={{ color: "#dde5dc" }}
      >
        Aún no tienes agentes creados
      </h2>
      <p className="text-sm" style={{ color: "#bbcabe" }}>
        Crea tu primer agente para empezar
      </p>
      <Link
        href="/agentes/crear"
        className="mt-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors"
        style={{
          backgroundColor: "#00bb7a",
          color: "#004329",
        }}
      >
        Crear tu primer agente
      </Link>
    </div>
  );
}
