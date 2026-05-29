import { AlertTriangle } from "lucide-react";

export function InboxUnassignedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: "#2d1a1a",
        color: "#f87171",
        border: "1px solid #5c2a2a",
      }}
    >
      <AlertTriangle size={10} aria-hidden="true" />
      Sin agente
    </span>
  );
}
