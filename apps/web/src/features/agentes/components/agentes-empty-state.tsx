import { Bot, Plus, BookOpen } from "lucide-react";
import Link from "next/link";

export function AgentesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24">
      {/* Icon */}
      <div
        className="flex h-20 w-20 items-center justify-center rounded-xl"
        style={{ backgroundColor: "#242c27", border: "1px solid #3c4a41" }}
      >
        <Bot size={36} style={{ color: "#bbcabe" }} aria-hidden="true" />
      </div>

      {/* Title */}
      <h2
        className="text-lg font-semibold"
        style={{ color: "#dde5dc", fontFamily: "Geist, sans-serif" }}
      >
        Aún no tienes agentes creados
      </h2>

      {/* Description */}
      <p
        className="max-w-sm text-center text-sm leading-relaxed"
        style={{ color: "#bbcabe" }}
      >
        Comienza creando tu primer agente para automatizar tus procesos. Podrás definir su comportamiento, modelo base y flujos de datos.
      </p>

      {/* CTA Button */}
      <Link
        href="/agentes/crear"
        className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-colors"
        style={{
          backgroundColor: "#00bb7a",
          color: "#004329",
        }}
      >
        <Plus size={16} aria-hidden="true" />
        Crear tu primer agente
      </Link>

      {/* Documentation link */}
      <a
        href="#"
        className="inline-flex items-center gap-1.5 text-xs transition-colors hover:underline"
        style={{ color: "#869489" }}
      >
        <BookOpen size={12} aria-hidden="true" />
        Ver documentación sobre agentes
      </a>
    </div>
  );
}
