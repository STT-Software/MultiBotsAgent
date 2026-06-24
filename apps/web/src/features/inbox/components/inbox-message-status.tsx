import { Check, Clock, X, Loader2, RotateCcw } from "lucide-react";
import { MessageStatus } from "../types/inbox.types";

interface InboxMessageStatusProps {
  status: MessageStatus;
  onRetry?: () => void;
}

const STATUS_CONFIG = {
  sending: {
    icon: <Loader2 size={10} className="animate-spin" aria-hidden="true" />,
    label: "Enviando...",
    color: "#869489",
  },
  sent: {
    icon: <Check size={10} aria-hidden="true" />,
    label: "Enviado",
    color: "#00bb7a",
  },
  pending: {
    icon: <Clock size={10} aria-hidden="true" />,
    label: "Pendiente",
    color: "#f0c87d",
  },
  failed: {
    icon: <X size={10} aria-hidden="true" />,
    label: "Error",
    color: "#f87171",
  },
} as const;

export function InboxMessageStatus({ status, onRetry }: InboxMessageStatusProps) {
  const config = STATUS_CONFIG[status];
  const showRetry = (status === "pending" || status === "failed") && onRetry;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="flex items-center gap-1 text-[10px]"
        style={{ color: config.color }}
      >
        {config.icon}
        {config.label}
      </span>
      {showRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-0.5 text-[10px] font-medium transition-colors"
          style={{ color: "#7db8f0" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <RotateCcw size={9} aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  );
}
