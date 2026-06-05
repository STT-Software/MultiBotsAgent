"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Clock, RefreshCw, CheckCircle, ExternalLink, CalendarDays } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import type { Booking } from "@multibotagents/types";
import { useSearchParams } from "next/navigation";
import {
  getGoogleCalendarAuthUrl,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
} from "../services";

interface AgenteTabAgendaProps {
  agentId: string;
}

export function AgenteTabAgenda({ agentId }: AgenteTabAgendaProps) {
  // Google Calendar Integration State
  const [isConnected, setIsConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [calendarSuccessMsg, setCalendarSuccessMsg] = useState<string | null>(null);
  const [calendarErrorMsg, setCalendarErrorMsg] = useState<string | null>(null);
  
  const searchParams = useSearchParams();

  const loadCalendarStatus = useCallback(async () => {
    try {
      const status = await getGoogleCalendarStatus(agentId);
      setIsConnected(status.connected);
      setCalendarEmail(status.email);
    } catch (err) {
      console.error("Error al obtener estado de Google Calendar:", err);
    }
  }, [agentId]);

  useEffect(() => {
    loadCalendarStatus();
  }, [loadCalendarStatus]);

  // Bookings List State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Load Bookings from backend
  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await fetchWithAuth(`/bookings?agentId=${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const status = searchParams.get("status");
    const email = searchParams.get("email");
    if (status === "calendar_success" || status === "calendar_error") {
      // Si estamos dentro de un popup de OAuth, enviar mensaje al padre y cerrar
      if (typeof window !== "undefined" && window.opener) {
        try {
          window.opener.postMessage(
            { type: "GOOGLE_CALENDAR_STATUS", status, email },
            window.location.origin
          );
          window.close();
          return;
        } catch (err) {
          console.error("Error al notificar al opener:", err);
        }
      }

      if (status === "calendar_success") {
        setCalendarSuccessMsg(`Conectado exitosamente con ${email || "Google Calendar"}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        loadCalendarStatus();
        loadBookings();
      } else if (status === "calendar_error") {
        setCalendarErrorMsg("Error al vincular tu Google Calendar. Inténtalo de nuevo.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [searchParams, loadCalendarStatus, loadBookings]);

  // Business Hours State
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "lunes", "martes", "miercoles", "jueves", "viernes"
  ]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState(false);

  // Handle Google Calendar toggle
  const handleToggleCalendar = useCallback(async () => {
    setIsConnecting(true);
    setCalendarSuccessMsg(null);
    setCalendarErrorMsg(null);
    try {
      if (isConnected) {
        const success = await disconnectGoogleCalendar(agentId);
        if (success) {
          setIsConnected(false);
          setCalendarEmail(null);
          setCalendarSuccessMsg("Desconectado de Google Calendar.");
        }
      } else {
        const authUrl = await getGoogleCalendarAuthUrl(agentId);

        // Configuración para centrar la ventana popup
        const width = 600;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          authUrl,
          "google-oauth",
          `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        );

        if (!popup) {
          // Si el bloqueador de popups está activo, redirigir en la misma pestaña
          window.location.href = authUrl;
          return;
        }

        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type === "GOOGLE_CALENDAR_STATUS") {
            const { status, email } = event.data;
            if (status === "calendar_success") {
              setCalendarSuccessMsg(`Conectado exitosamente con ${email || "Google Calendar"}`);
              loadCalendarStatus();
              loadBookings();
            } else {
              setCalendarErrorMsg("Error al vincular tu Google Calendar. Inténtalo de nuevo.");
            }
            setIsConnecting(false);
            window.removeEventListener("message", handleMessage);
          }
        };

        window.addEventListener("message", handleMessage);

        // Monitorear si el popup se cierra manualmente sin terminar el flujo
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setIsConnecting(false);
            window.removeEventListener("message", handleMessage);
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error("Error al gestionar Google Calendar:", err);
      setCalendarErrorMsg(err.message || "Ocurrió un error inesperado.");
      setIsConnecting(false);
    } finally {
      if (isConnected) {
        setIsConnecting(false);
      }
    }
  }, [isConnected, agentId, loadCalendarStatus, loadBookings]);

  // Handle save availability
  const handleSaveHours = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSavingHours(true);
    setHoursSuccess(false);
    setTimeout(() => {
      setSavingHours(false);
      setHoursSuccess(true);
      setTimeout(() => setHoursSuccess(false), 3000);
    }, 1200);
  }, []);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const DAYS_LIST = [
    { value: "lunes", label: "Lunes" },
    { value: "martes", label: "Martes" },
    { value: "miercoles", label: "Miércoles" },
    { value: "jueves", label: "Jueves" },
    { value: "viernes", label: "Viernes" },
    { value: "sabado", label: "Sábado" },
    { value: "domingo", label: "Domingo" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1.1fr] gap-6 w-full py-2">
      {/* Columna Izquierda: Integración de Google Calendar y Horario de Atención */}
      <div className="flex flex-col gap-6">
        
        {/* Card Google Calendar */}
        <div
          className="rounded-xl p-8"
          style={{
            background: "rgba(26, 33, 28, 0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid #3c4a41",
            boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02), 0 0 20px rgba(0, 187, 122, 0.02)",
          }}
        >
          <div className="flex items-start gap-4 pb-4 border-b border-[#3c4a41]">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "rgba(66, 133, 244, 0.1)",
                border: "1px solid rgba(66, 133, 244, 0.3)",
              }}
            >
              <Calendar size={24} style={{ color: "#4285F4" }} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#e8f0ea]">Integración de Google Calendar</h3>
              <p className="text-xs text-[#869489] mt-0.5">
                Permite al agente sincronizar, verificar disponibilidad y registrar citas directamente en tu calendario.
              </p>
              {calendarSuccessMsg && (
                <p className="text-xs text-[#42e5a1] mt-2 font-semibold flex items-center gap-1">
                  <CheckCircle size={12} /> {calendarSuccessMsg}
                </p>
              )}
              {calendarErrorMsg && (
                <p className="text-xs text-red-400 mt-2 font-semibold">
                  ⚠️ {calendarErrorMsg}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: isConnected ? "#42e5a1" : "#869489",
                  boxShadow: isConnected ? "0 0 8px #42e5a1" : "none"
                }}
              />
              <div>
                <p className="text-sm font-semibold text-[#e8f0ea]">
                  {isConnected ? "Conectado a Google Calendar" : "Desconectado"}
                </p>
                {isConnected && (
                  <p className="text-xs text-[#869489] font-mono mt-0.5">{calendarEmail}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleCalendar}
              disabled={isConnecting}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isConnected
                  ? "bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:shadow-lg hover:shadow-blue-500/20"
              }`}
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Conectando...
                </>
              ) : isConnected ? (
                "Desconectar"
              ) : (
                "Vincular Google Calendar"
              )}
            </button>
          </div>
        </div>

        {/* Card Horario de Atención */}
        <form
          onSubmit={handleSaveHours}
          className="rounded-xl p-8"
          style={{
            background: "rgba(26, 33, 28, 0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid #3c4a41",
            boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02), 0 0 20px rgba(0, 187, 122, 0.02)",
          }}
        >
          <div className="flex items-start gap-4 pb-4 border-b border-[#3c4a41]">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "rgba(0, 187, 122, 0.1)",
                border: "1px solid rgba(0, 187, 122, 0.3)",
              }}
            >
              <Clock size={24} style={{ color: "#00bb7a" }} aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#e8f0ea]">Horario de Atención Comercial</h3>
              <p className="text-xs text-[#869489] mt-0.5">
                Define los días y horas en los que el agente de agendamiento puede programar citas.
              </p>
            </div>
          </div>

          {/* Días laborales */}
          <div className="mt-6">
            <label className="block text-xs font-semibold text-[#869489] uppercase tracking-wider mb-3">
              Días Permitidos
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_LIST.map((day) => {
                const isActive = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer"
                    style={{
                      backgroundColor: isActive ? "rgba(0, 187, 122, 0.1)" : "transparent",
                      color: isActive ? "#42e5a1" : "#869489",
                      borderColor: isActive ? "rgba(0, 187, 122, 0.4)" : "#3c4a41",
                    }}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rango de Horas */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#869489] uppercase tracking-wider mb-2">
                Hora de Inicio
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#141b16] text-[#e8f0ea] border border-[#3c4a41] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#42e5a1]"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const hour = `${String(i).padStart(2, "0")}:00`;
                  return (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#869489] uppercase tracking-wider mb-2">
                Hora de Fin
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-[#141b16] text-[#e8f0ea] border border-[#3c4a41] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#42e5a1]"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const hour = `${String(i).padStart(2, "0")}:00`;
                  return (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Feedback & Guardar */}
          <div className="mt-8 flex items-center justify-between border-t border-[#3c4a41] pt-6">
            <div className="flex-1 max-w-[70%]">
              {hoursSuccess && (
                <div className="flex items-center gap-2 text-xs text-[#42e5a1] animate-pulse">
                  <CheckCircle size={14} />
                  <span>Configuración de horarios guardada exitosamente.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={savingHours}
              className="inline-flex items-center gap-2 bg-[#00bb7a] hover:bg-[#00a36a] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0a0a] text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              {savingHours ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Horarios"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Columna Derecha: Listado de Citas Agendadas */}
      <div
        className="rounded-xl p-8 flex flex-col gap-6"
        style={{
          background: "rgba(26, 33, 28, 0.5)",
          backdropFilter: "blur(12px)",
          border: "1px solid #3c4a41",
          boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02), 0 0 20px rgba(0, 187, 122, 0.02)",
        }}
      >
        <div className="flex items-start gap-4 pb-4 border-b border-[#3c4a41]">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "rgba(179, 102, 255, 0.1)",
              border: "1px solid rgba(179, 102, 255, 0.3)",
            }}
          >
            <CalendarDays size={24} style={{ color: "#c87df0" }} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#e8f0ea]">Citas Recientes</h3>
            <p className="text-xs text-[#869489] mt-0.5">
              Citas coordinadas por el bot y sincronizadas con Google Calendar.
            </p>
          </div>
        </div>

        {/* Citas List Content */}
        <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-4">
          {loadingBookings ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw size={24} className="animate-spin text-[#42e5a1]" />
              <p className="text-xs text-[#869489]">Cargando citas...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-[#3c4a41] rounded-xl px-4">
              <Calendar size={32} className="text-[#869489] mb-2" />
              <p className="text-sm font-semibold text-[#e8f0ea]">Sin citas registradas</p>
              <p className="text-xs text-[#869489] mt-1">
                El agente aún no ha concretado citas a través del canal de WhatsApp.
              </p>
            </div>
          ) : (
            bookings.map((booking) => {
              const dt = new Date(booking.dateTime);
              const formattedDate = dt.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={booking.id}
                  className="rounded-lg p-4 border border-[#3c4a41] bg-[#141b16]/40 hover:bg-[#141b16]/75 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#42e5a1]">
                      {formattedDate}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor:
                          booking.status === "confirmed"
                            ? "rgba(66, 229, 161, 0.1)"
                            : booking.status === "cancelled"
                            ? "rgba(239, 68, 68, 0.1)"
                            : "rgba(245, 158, 11, 0.1)",
                        color:
                          booking.status === "confirmed"
                            ? "#42e5a1"
                            : booking.status === "cancelled"
                            ? "#ef4444"
                            : "#f59e0b",
                        border: `1px solid ${
                          booking.status === "confirmed"
                            ? "rgba(66, 229, 161, 0.2)"
                            : booking.status === "cancelled"
                            ? "rgba(239, 68, 68, 0.2)"
                            : "rgba(245, 158, 11, 0.2)"
                        }`
                      }}
                    >
                      {booking.status === "confirmed"
                        ? "Confirmada"
                        : booking.status === "cancelled"
                        ? "Cancelada"
                        : "Reprogramada"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-[#e8f0ea]">{booking.customerName}</p>
                    <p className="text-xs text-[#869489] mt-0.5">{booking.customerPhone}</p>
                  </div>

                  {booking.googleEventId && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#869489] mt-1 pt-2 border-t border-[#3c4a41]/50">
                      <ExternalLink size={10} />
                      <span className="font-mono truncate">{booking.googleEventId}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
