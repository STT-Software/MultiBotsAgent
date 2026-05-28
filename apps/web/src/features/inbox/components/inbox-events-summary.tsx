"use client";

import { Activity, Clock } from "lucide-react";
import { useEscalationEvents } from "../hooks/use-escalation-events";

export function InboxEventsSummary() {
  const { summary, loading } = useEscalationEvents();

  if (loading) {
    return (
      <div
        className="flex items-center gap-4 px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid #3c4a41", backgroundColor: "#1a1f1c" }}
      >
        <div className="h-3 w-40 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-5 px-4 py-2.5 shrink-0"
      style={{ borderBottom: "1px solid #3c4a41", backgroundColor: "#1a1f1c" }}
    >
      <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#869489" }}>
        <Activity size={12} aria-hidden="true" />
        Escalamientos hoy: <span style={{ color: "#dde5dc" }}>{summary.todayCount}</span>
      </span>
      <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#869489" }}>
        <Clock size={12} aria-hidden="true" />
        Tiempo promedio: <span style={{ color: "#dde5dc" }}>{summary.avgDurationMinutes} min</span>
      </span>
    </div>
  );
}
