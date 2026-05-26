"use client";

import { useEffect, useState } from "react";

interface UseWaitTimerReturn {
  timeLabel: string;
  isUrgent: boolean;
}

function calculateTimeLabel(escalatedAt: string): string {
  const now = new Date();
  const date = new Date(escalatedAt);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "hace menos de 1 min";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays}d`;
}

function isUrgentWait(escalatedAt: string): boolean {
  const now = new Date();
  const date = new Date(escalatedAt);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  return diffMin >= 30;
}

export function useWaitTimer(escalatedAt: string): UseWaitTimerReturn {
  const [timeLabel, setTimeLabel] = useState(() => calculateTimeLabel(escalatedAt));
  const [isUrgent, setIsUrgent] = useState(() => isUrgentWait(escalatedAt));

  useEffect(() => {
    setTimeLabel(calculateTimeLabel(escalatedAt));
    setIsUrgent(isUrgentWait(escalatedAt));

    const interval = setInterval(() => {
      setTimeLabel(calculateTimeLabel(escalatedAt));
      setIsUrgent(isUrgentWait(escalatedAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [escalatedAt]);

  return { timeLabel, isUrgent };
}
