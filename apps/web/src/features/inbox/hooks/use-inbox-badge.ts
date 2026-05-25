"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchPendingCount } from "../services/inbox.service";

export function useInboxBadge(): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const pending = await fetchPendingCount();
      setCount(pending);
    } catch {
      // Silently fail — badge is non-critical
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return count;
}
