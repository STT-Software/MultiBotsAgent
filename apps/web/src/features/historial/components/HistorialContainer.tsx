"use client";

import React, { useState } from "react";
import { useHistorial } from "../hooks/use-historial";
import {
  Clock,
  RefreshCw,
  Search,
  User,
  Eye,
  X,
  FileCode,
  AlertCircle,
  PlusCircle,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import type { AuditLog } from "../types";

export function HistorialContainer() {
  const {
    logs,
    loading,
    error,
    page,
    totalPages,
    total,
    refresh,
    handlePageChange,
  } = useHistorial(1, 10);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // Filtrado local por término de búsqueda (sobre los logs cargados en la página actual)
  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.userEmail.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.description.toLowerCase().includes(term) ||
      log._id.toLowerCase().includes(term)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "agent.create":
        return {
          bg: "#132d21",
          border: "#23553c",
          text: "#4ade80",
          icon: <PlusCircle size={14} className="text-[#4ade80]" />,
          label: "Creación",
        };
      case "agent.update":
        return {
          bg: "#2d2213",
          border: "#553e1f",
          text: "#fbbf24",
          icon: <Edit size={14} className="text-[#fbbf24]" />,
          label: "Actualización",
        };
      case "agent.delete":
        return {
          bg: "#2d1313",
          border: "#551f1f",
          text: "#f87171",
          icon: <Trash2 size={14} className="text-[#f87171]" />,
          label: "Eliminación",
        };
      default:
        return {
          bg: "#1c1c24",
          border: "#323246",
          text: "#a78bfa",
          icon: <Info size={14} className="text-[#a78bfa]" />,
          label: action,
        };
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Subheader */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "#bbcabe" }}>
          Registro cronológico detallado de las acciones administrativas y de auditoría de tu cuenta.
        </p>
        <button
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            borderColor: "#3c4a41",
            backgroundColor: "#16221d",
            color: "#dde5dc",
          }}
          aria-label="Actualizar logs de auditoría"
        >
          <RefreshCw
            size={14}
            className={`${isRefreshing || loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refrescar
        </button>
      </div>

      {/* Control de filtros */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center" style={{ color: "#869489" }}>
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por usuario, acción o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md py-2 pl-10 pr-4 text-sm outline-none transition-colors border"
            style={{
              backgroundColor: "#111916",
              borderColor: "#3c4a41",
              color: "#dde5dc",
            }}
          />
        </div>
      </div>

      {/* States: Error, Loading, Empty, Table */}
      {error && (
        <div
          className="flex flex-col items-center justify-center rounded-xl p-8 text-center border"
          style={{ backgroundColor: "#2d1313", borderColor: "#551f1f", color: "#f87171" }}
        >
          <AlertCircle size={32} className="mb-2" />
          <h3 className="font-semibold text-lg">Error al cargar la auditoría</h3>
          <p className="text-sm text-red-300 max-w-md mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded px-4 py-2 text-xs font-semibold"
            style={{ backgroundColor: "#551f1f", color: "#f87171" }}
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && loading && (
        <div className="flex flex-col gap-3 rounded-xl p-5 border" style={{ backgroundColor: "#111916", borderColor: "#3c4a41" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-[#1e2520]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#1c2420]" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-40 rounded bg-[#1c2420]" />
                  <div className="h-3 w-64 rounded bg-[#1c2420]" />
                </div>
              </div>
              <div className="h-8 w-16 rounded bg-[#1c2420]" />
            </div>
          ))}
        </div>
      )}

      {!error && !loading && filteredLogs.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-xl p-12 text-center border"
          style={{ backgroundColor: "#111916", borderColor: "#3c4a41" }}
        >
          <Clock size={48} className="mb-3" style={{ color: "#869489" }} />
          <h3 className="text-lg font-semibold" style={{ color: "#dde5dc" }}>
            No se encontraron eventos
          </h3>
          <p className="text-sm max-w-sm mt-1" style={{ color: "#869489" }}>
            No hay registros de auditoría en este momento o ningún registro coincide con tu búsqueda.
          </p>
        </div>
      )}

      {!error && !loading && filteredLogs.length > 0 && (
        <div className="flex flex-col gap-4">
          <div
            className="w-full rounded-xl overflow-hidden border"
            style={{ backgroundColor: "#111916", borderColor: "#3c4a41" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#0b120f", borderBottom: "1px solid #3c4a41" }}>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "#bbcabe" }}>
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "#bbcabe" }}>
                      Usuario
                    </th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "#bbcabe" }}>
                      Acción
                    </th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider" style={{ color: "#bbcabe" }}>
                      Descripción
                    </th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right" style={{ color: "#bbcabe" }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2520]">
                  {filteredLogs.map((log) => {
                    const badge = getActionBadge(log.action);
                    const dateObj = new Date(log.timestamp);
                    const formattedDate = dateObj.toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const formattedTime = dateObj.toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    return (
                      <tr key={log._id} className="hover:bg-[#16221d]/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium" style={{ color: "#dde5dc" }}>{formattedDate}</span>
                            <span className="text-xs" style={{ color: "#869489" }}>{formattedTime}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full p-1 bg-[#1a2b24] border border-[#2d4d3f]">
                              <User size={12} style={{ color: "#4ade80" }} />
                            </div>
                            <span style={{ color: "#dde5dc" }}>{log.userEmail}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                            style={{
                              backgroundColor: badge.bg,
                              borderColor: badge.border,
                              color: badge.text,
                            }}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span style={{ color: "#dde5dc" }}>{log.description}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors border"
                            style={{
                              backgroundColor: "#16221d",
                              borderColor: "#3c4a41",
                              color: "#4ade80",
                            }}
                            aria-label="Ver detalles del evento"
                          >
                            <Eye size={12} />
                            Detalles
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Controles de Paginación */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs" style={{ color: "#869489" }}>
              Mostrando <span className="font-semibold text-white">{filteredLogs.length}</span> registros (Total: {total})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded border transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: "#111916",
                  borderColor: "#3c4a41",
                  color: "#dde5dc",
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs" style={{ color: "#bbcabe" }}>
                Página <span className="font-semibold text-white">{page}</span> de {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded border transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: "#111916",
                  borderColor: "#3c4a41",
                  color: "#dde5dc",
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer lateral de detalles del Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedLog(null)}
          />

          {/* Drawer content */}
          <div
            className="relative w-full max-w-lg h-full flex flex-col shadow-2xl transition-transform duration-300 ease-out border-l animate-slide-in"
            style={{
              backgroundColor: "#0b120f",
              borderColor: "#3c4a41",
            }}
          >
            {/* Header Drawer */}
            <div className="flex items-center justify-between border-b p-5" style={{ borderColor: "#3c4a41" }}>
              <div className="flex items-center gap-2">
                <FileCode className="text-[#00bb7a]" size={20} />
                <h3 className="font-semibold text-base" style={{ color: "#dde5dc" }}>
                  Detalle del Evento
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded p-1 hover:bg-[#16221d] transition-colors"
                style={{ color: "#869489" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Drawer */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-4 rounded-lg p-4 border" style={{ backgroundColor: "#111916", borderColor: "#3c4a41" }}>
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "#869489" }}>
                    ID Evento
                  </span>
                  <p className="text-xs font-mono select-all truncate mt-0.5" style={{ color: "#dde5dc" }}>
                    {selectedLog._id}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "#869489" }}>
                    Acción
                  </span>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: getActionBadge(selectedLog.action).text }}>
                    {selectedLog.action}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "#869489" }}>
                    Usuario Ejecutor
                  </span>
                  <p className="text-xs truncate mt-0.5" style={{ color: "#dde5dc" }}>
                    {selectedLog.userEmail}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "#869489" }}>
                    Fecha y Hora
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: "#dde5dc" }}>
                    {new Date(selectedLog.timestamp).toLocaleString("es-ES")}
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium" style={{ color: "#bbcabe" }}>
                  Descripción de la actividad
                </span>
                <div
                  className="rounded-lg p-4 text-sm leading-relaxed border"
                  style={{ backgroundColor: "#111916", borderColor: "#3c4a41", color: "#dde5dc" }}
                >
                  {selectedLog.description}
                </div>
              </div>

              {/* Metadatos (Código JSON) */}
              <div className="space-y-1.5 flex-1 flex flex-col">
                <span className="text-xs font-medium" style={{ color: "#bbcabe" }}>
                  Metadatos (Datos Estructurados)
                </span>
                <div
                  className="flex-1 rounded-lg p-4 font-mono text-xs overflow-auto border"
                  style={{
                    backgroundColor: "#050807",
                    borderColor: "#3c4a41",
                    color: "#00ff9d",
                  }}
                >
                  <pre className="whitespace-pre-wrap select-all">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer Drawer */}
            <div className="border-t p-4 flex justify-end" style={{ borderColor: "#3c4a41" }}>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded px-4 py-2 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: "#16221d",
                  border: "1px solid #3c4a41",
                  color: "#dde5dc",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
