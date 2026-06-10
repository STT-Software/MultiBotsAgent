import { useState, useEffect, useCallback } from "react";
import { fetchAuditLogs } from "../services/historial.service";
import type { AuditLog } from "../types";

export function useHistorial(initialPage = 1, initialLimit = 10) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAuditLogs(page, limit);
      setLogs(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al cargar historial");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return {
    logs,
    loading,
    error,
    page,
    limit,
    totalPages,
    total,
    refresh: loadLogs,
    handlePageChange,
  };
}
