"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader2, ShieldCheck, TrendingUp, Settings } from "lucide-react";

import { Agente, UpdateAgenteDTO } from "../types/agentes.types";
import { TipoAgenteSelector } from "./tipo-agente-selector";

interface AgenteTabGeneralProps {
  agente: Agente;
  editarAgente: (dto: UpdateAgenteDTO) => Promise<void>;
  saving: boolean;
  error: string | null;
  success: boolean;
  resetStatus: () => void;
}

// Descripción contextual según el estado
const ESTADO_DESCRIPTIONS: Record<string, string> = {
  activo:
    "El agente está actualmente activo, procesando mensajes y respondiendo a tus clientes en tiempo real en los canales vinculados.",
  borrador:
    "El agente está desactivado o en modo borrador. No responderá a ningún mensaje recibido hasta que decidas publicarlo.",
};

export function AgenteTabGeneral({
  agente,
  editarAgente,
  saving,
  error,
  success,
  resetStatus,
}: AgenteTabGeneralProps) {
  const [nombre, setNombre] = useState(agente.nombre);
  const [tipo, setTipo] = useState<"rag" | "cotizador" | "agendamiento">(agente.tipo);

  // Sincronizar con agente actualizado
  useEffect(() => {
    setNombre(agente.nombre);
    setTipo(agente.tipo);
  }, [agente.nombre, agente.tipo]);

  // Limpiar feedback después de 3 segundos
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        resetStatus();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error, resetStatus]);

  const hasChanges = nombre.trim() !== agente.nombre || tipo !== agente.tipo;
  const isValid = nombre.trim().length >= 1;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!hasChanges || !isValid || saving) return;

      const dto: UpdateAgenteDTO = {};
      if (nombre.trim() !== agente.nombre) dto.nombre = nombre.trim();
      if (tipo !== agente.tipo) dto.tipo = tipo;

      await editarAgente(dto);
    },
    [hasChanges, isValid, saving, nombre, tipo, agente.nombre, agente.tipo, editarAgente]
  );

  const isActivo = agente.estado === "activo";

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 w-full"
    >
      {/* Columna Izquierda: Formulario Principal */}
      <div
        className="flex flex-col gap-6 overflow-hidden rounded-xl p-8"
        style={{
          background: "rgba(26, 33, 28, 0.5)",
          backdropFilter: "blur(12px)",
          border: "1px solid #3c4a41",
          boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02), 0 0 20px rgba(0, 187, 122, 0.02)",
        }}
      >
        {/* Encabezado decorativo */}
        <div className="flex items-start gap-4 pb-4" style={{ borderBottom: "1.5px solid #3c4a41" }}>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "rgba(0, 187, 122, 0.1)",
              border: "1px solid rgba(0, 187, 122, 0.3)",
            }}
          >
            <Settings size={24} style={{ color: "#00bb7a" }} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold" style={{ color: "#e8f0ea", fontFamily: "Geist, Inter, sans-serif" }}>
              Configuración General del Agente
            </h2>
            <p className="text-xs" style={{ color: "#869489" }}>
              Administra el nombre interno, el tipo de agente y revisa su estado operativo actual.
            </p>
          </div>
        </div>

        {/* Nombre (editable) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="agente-nombre"
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "#869489" }}
          >
            Nombre del agente
          </label>
          <div className="relative">
            <input
              id="agente-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl px-4 py-3 pr-10 text-sm outline-none transition-colors"
              style={{
                backgroundColor: "#0e1510",
                border: "1.5px solid #3c4a41",
                color: "#dde5dc",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#00bb7a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#3c4a41")}
              disabled={saving}
            />
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5a6b5e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </div>
          {nombre.trim().length === 0 && (
            <p className="text-xs text-red-400">El nombre es obligatorio</p>
          )}
        </div>

        {/* Tipo (editable) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#869489" }}>
            Tipo de agente
          </label>
          <TipoAgenteSelector
            value={tipo}
            onChange={(nuevoTipo) => setTipo(nuevoTipo)}
          />
        </div>

        {/* Botón guardar */}
        <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid #3c4a41" }}>
          <button
            type="submit"
            disabled={!hasChanges || !isValid || saving}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150"
            style={{
              backgroundColor: hasChanges && isValid && !saving ? "#00bb7a" : "#2a2e2b",
              color: hasChanges && isValid && !saving ? "#0a0a0a" : "#5a6b5e",
              cursor: hasChanges && isValid && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>

          {/* Feedback */}
          {success && (
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#49df9a" }}>
              <CheckCircle size={14} aria-hidden="true" />
              Cambios guardados
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
              <AlertCircle size={14} aria-hidden="true" />
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Columna Derecha: Estado actual, eficiencia y guías */}
      <div className="flex flex-col gap-6">
        {/* Estado card */}
        <div
          className="flex flex-col gap-3 rounded-xl p-6"
          style={{
            background: "rgba(26, 33, 28, 0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid #3c4a41",
            boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02)",
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: isActivo ? "#00bb7a" : "#869489" }}
              >
                Estado actual
              </span>
              <span className="flex items-center gap-2 text-base font-bold" style={{ color: "#e8f0ea" }}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: isActivo ? "#49df9a" : "#869489" }}
                  aria-hidden="true"
                />
                {isActivo ? "Activo" : "Borrador"}
              </span>
            </div>
            <ShieldCheck
              size={20}
              style={{ color: isActivo ? "#00bb7a" : "#5a6b5e" }}
              aria-hidden="true"
            />
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#869489" }}>
            {ESTADO_DESCRIPTIONS[agente.estado] ?? ""}
          </p>
          <div className="pt-2" style={{ borderTop: "1px solid rgba(60, 74, 65, 0.4)" }}>
            {isActivo ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => editarAgente({ estado: "borrador" })}
                className="w-full rounded-lg py-2.5 text-xs font-bold transition-all duration-200"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
                }}
              >
                {saving ? "Procesando..." : "Desactivar temporalmente"}
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => editarAgente({ estado: "activo" })}
                className="w-full rounded-lg py-2.5 text-xs font-bold transition-all duration-200"
                style={{
                  backgroundColor: "#00bb7a",
                  border: "1px solid rgba(0, 187, 122, 0.3)",
                  color: "#0a0a0a",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#00d98e";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#00bb7a";
                }}
              >
                {saving ? "Procesando..." : "Activar / Publicar agente"}
              </button>
            )}
          </div>
        </div>

        {/* Eficiencia card (estático) */}
        <div
          className="flex items-center justify-between gap-4 rounded-xl p-6"
          style={{
            background: "rgba(26, 33, 28, 0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid #3c4a41",
            boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02)",
          }}
        >
          <div className="flex flex-col gap-1">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#869489" }}
            >
              Eficiencia del Bot
            </span>
            <span className="text-2xl font-bold" style={{ color: "#e8f0ea" }}>
              98.4%
            </span>
          </div>
          <TrendingUp size={24} style={{ color: "#00bb7a" }} aria-hidden="true" />
        </div>

        {/* Info card */}
        <div
          className="rounded-xl p-6 border border-[#3c4a41]"
          style={{ background: "rgba(14, 21, 16, 0.3)" }}
        >
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#dde5dc" }}>
            Tipos de Agente
          </h3>
          <ul className="text-xs space-y-3 leading-relaxed" style={{ color: "#869489" }}>
            <li>
              <strong style={{ color: "#00bb7a" }}>RAG (Generación Aumentada):</strong> Responde preguntas de clientes usando la base de conocimiento cargada en documentos.
            </li>
            <li>
              <strong style={{ color: "#00bb7a" }}>Cotizador:</strong> Interactúa dinámicamente con catálogos e inventarios para estimar costos.
            </li>
            <li>
              <strong style={{ color: "#00bb7a" }}>Agendamiento:</strong> Organiza fechas, gestiona cancelaciones y bloquea espacios en agenda de manera autónoma.
            </li>
          </ul>
        </div>
      </div>
    </form>
  );
}
