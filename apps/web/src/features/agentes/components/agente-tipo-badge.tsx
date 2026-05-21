interface AgenteTipoBadgeProps {
  tipo: "rag" | "cotizador" | "agendamiento";
}

const TIPO_CONFIG = {
  rag: {
    label: "RAG",
    bg: "#1a2f4a",
    text: "#7db8f0",
    border: "#2d4a6e",
  },
  cotizador: {
    label: "Cotizador",
    bg: "#3d2f1a",
    text: "#f0c87d",
    border: "#6e5a2d",
  },
  agendamiento: {
    label: "Agendamiento",
    bg: "#2f1a3d",
    text: "#c87df0",
    border: "#5a2d6e",
  },
} as const;

export function AgenteTipoBadge({ tipo }: AgenteTipoBadgeProps) {
  const config = TIPO_CONFIG[tipo];

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      {config.label}
    </span>
  );
}
