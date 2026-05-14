interface AgenteEstadoBadgeProps {
  estado: "borrador" | "activo";
}

const ESTADO_CONFIG = {
  activo: {
    label: "Activo",
    dotColor: "#49df9a",
    bg: "#1a3d2f",
    text: "#7df0c8",
    border: "#2d6e5a",
  },
  borrador: {
    label: "Borrador",
    dotColor: "#869489",
    bg: "#2a2e2b",
    text: "#8a9a8e",
    border: "#3c4a41",
  },
} as const;

export function AgenteEstadoBadge({ estado }: AgenteEstadoBadgeProps) {
  const config = ESTADO_CONFIG[estado];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.dotColor }}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
