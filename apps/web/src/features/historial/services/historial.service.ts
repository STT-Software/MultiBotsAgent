import { fetchWithAuth } from "@/lib/auth";
import type { AuditLogsResponse } from "../types";

export async function fetchAuditLogs(page = 1, limit = 10): Promise<AuditLogsResponse> {
  const res = await fetchWithAuth(`/auditoria?page=${page}&limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Error al obtener historial de auditoría: ${res.status}`);
  }
  return res.json();
}
