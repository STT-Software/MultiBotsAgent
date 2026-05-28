"use client";

import { useCallback, useEffect, useState } from "react";

import { EscalationEventsSummary, fetchEscalationEvents } from "../services/inbox.service";

interface UseEscalationEventsReturn {
  summary: EscalationEventsSummary;
  loading: boolean;
}

export function useEscalationEvents(): UseEscalationEventsReturn {
  const [summary, setSummary] = useState<EscalationEventsSummary>({ todayCount: 0, avgDurationMinutes: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchEscalationEvents();
      setSummary(response.summary);
    } catch {
      // Silently fail — summary is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { summary, loading };
}
