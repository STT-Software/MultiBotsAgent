import { CloudOff, RefreshCw, AlertTriangle, Clock } from "lucide-react";

interface AgentesListErrorProps {
  onRetry: () => void;
  error?: string | null;
}

export function AgentesListError({ onRetry, error }: AgentesListErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      {/* Icon */}
      <div
        className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed"
        style={{ borderColor: "#3c4a41", backgroundColor: "#1a211c" }}
      >
        <CloudOff size={40} style={{ color: "#49df9a" }} aria-hidden="true" />
      </div>

      {/* Title */}
      <h2
        className="text-xl font-semibold"
        style={{ color: "#dde5dc", fontFamily: "Geist, sans-serif" }}
      >
        Error al cargar los agentes
      </h2>

      {/* Description */}
      <p
        className="max-w-md text-center text-sm leading-relaxed"
        style={{ color: "#bbcabe" }}
      >
        No se pudieron cargar los agentes creados para esta empresa. Por favor, compruebe su conexión e inténtelo de nuevo.
      </p>

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-medium transition-all hover:shadow-[0_0_12px_rgba(0,187,122,0.3)]"
        style={{
          color: "#00bb7a",
          border: "1px solid #00bb7a",
          backgroundColor: "transparent",
        }}
      >
        <RefreshCw size={14} aria-hidden="true" />
        Reintentar
      </button>

      {/* Technical info cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className="flex items-start gap-3 rounded-lg border px-4 py-3"
          style={{ backgroundColor: "#1a211c", borderColor: "#3c4a41" }}
        >
          <AlertTriangle size={16} style={{ color: "#ffb4ab" }} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col">
            <span
              className="text-xs font-semibold"
              style={{ color: "#dde5dc" }}
            >
              API Endpoint Error
            </span>
            <span
              className="text-[11px]"
              style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
            >
              /agents – {error || "Fallo en la solicitud"}
            </span>
          </div>
        </div>

        <div
          className="flex items-start gap-3 rounded-lg border px-4 py-3"
          style={{ backgroundColor: "#1a211c", borderColor: "#3c4a41" }}
        >
          <Clock size={16} style={{ color: "#bbcabe" }} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col">
            <span
              className="text-xs font-semibold"
              style={{ color: "#dde5dc" }}
            >
              System Timestamp
            </span>
            <span
              className="text-[11px]"
              style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
            >
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              –{" "}
              {new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
                timeZone: "UTC",
              })}{" "}
              UTC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
