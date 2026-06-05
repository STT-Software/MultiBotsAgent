import { fetchWithAuth } from "@/lib/auth";

export interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
}

/**
 * Obtiene la URL de consentimiento para conectar Google Calendar del agente.
 */
export async function getGoogleCalendarAuthUrl(agentId: string): Promise<string> {
  const res = await fetchWithAuth(`/bookings/google-calendar/auth-url?agentId=${agentId}`);
  if (!res.ok) {
    throw new Error(`Error al obtener URL de autenticación: ${res.status}`);
  }
  const data = await res.json();
  return data.url;
}

/**
 * Obtiene el estado de la conexión de Google Calendar del agente.
 */
export async function getGoogleCalendarStatus(agentId: string): Promise<GoogleCalendarStatus> {
  const res = await fetchWithAuth(`/bookings/google-calendar/status?agentId=${agentId}`);
  if (!res.ok) {
    throw new Error(`Error al obtener estado de Google Calendar: ${res.status}`);
  }
  return res.json();
}

/**
 * Desvincula Google Calendar del agente.
 */
export async function disconnectGoogleCalendar(agentId: string): Promise<boolean> {
  const res = await fetchWithAuth(`/bookings/google-calendar/disconnect?agentId=${agentId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Error al desvincular Google Calendar: ${res.status}`);
  }
  const data = await res.json();
  return data.success;
}
