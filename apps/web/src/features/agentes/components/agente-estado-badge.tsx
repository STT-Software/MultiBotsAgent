interface AgenteEstadoBadgeProps {
  estado: "borrador" | "activo";
}

const ESTADO_CONFIG = {
  activo: {
    label: "Activo",
    bg: "#1a3d2f",
    text: "#7df0c8",
    border: "#2d6e5a",
  },
  borrador: {
    label: "Borrador",
    bg: "#2a2e2b",
    text: "#8a9a8e",
    border: "#3c4a41",
  },
} as const;

export function AgenteEstadoBadge({ estado }: AgenteEstadoBadgeProps) {
  const config = ESTADO_CONFIG[estado];

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
