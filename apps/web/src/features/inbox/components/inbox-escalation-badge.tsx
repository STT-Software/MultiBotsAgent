import { UserCheck, AlertTriangle } from "lucide-react";

import { EscalationType } from "../types/inbox.types";

interface InboxEscalationBadgeProps {
  type: EscalationType;
}

const BADGE_CONFIG = {
  explicit: {
    label: "Solicitud del usuario",
    icon: <UserCheck size={12} aria-hidden="true" />,
    bg: "#1e2a35",
    text: "#7db8f0",
    border: "#3a5068",
  },
  agent_detected: {
    label: "Detectado por agente",
    icon: <AlertTriangle size={12} aria-hidden="true" />,
    bg: "#2a2410",
    text: "#f0c87d",
    border: "#5c4a10",
  },
} as const;

export function InboxEscalationBadge({ type }: InboxEscalationBadgeProps) {
  const config = BADGE_CONFIG[type];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
