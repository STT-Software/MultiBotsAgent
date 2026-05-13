import { AlertCircle } from "lucide-react";

interface AgentesListErrorProps {
  onRetry: () => void;
}

export function AgentesListError({ onRetry }: AgentesListErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <AlertCircle size={32} color="#ffb4ab" aria-hidden="true" />
      <p className="text-base" style={{ color: "#bbcabe" }}>
        No pudimos cargar los agentes
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-md text-sm font-medium transition-all hover:shadow-[0_0_8px_rgba(0,187,122,0.3)]"
        style={{
          color: "#00bb7a",
          border: "1px solid #00bb7a",
          backgroundColor: "transparent",
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
