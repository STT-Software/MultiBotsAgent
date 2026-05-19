"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

import { Agente, UpdateAgenteDTO } from "../types/agentes.types";
import { AgenteEstadoBadge } from "./agente-estado-badge";
import { TipoAgenteSelector } from "./tipo-agente-selector";

interface AgenteTabGeneralProps {
  agente: Agente;
  editarAgente: (dto: UpdateAgenteDTO) => Promise<void>;
  saving: boolean;
  error: string | null;
  success: boolean;
  resetStatus: () => void;
}

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-lg">
      {/* Estado (no editable) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "#869489" }}>
          Estado
        </label>
        <div>
          <AgenteEstadoBadge estado={agente.estado} />
        </div>
      </div>

      {/* Nombre (editable) */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="agente-nombre"
          className="text-xs font-medium"
          style={{ color: "#869489" }}
        >
          Nombre del agente
        </label>
        <input
          id="agente-nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
          style={{
            backgroundColor: "#0e1510",
            border: "1.5px solid #3c4a41",
            color: "#dde5dc",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#00bb7a")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#3c4a41")}
          disabled={saving}
        />
        {nombre.trim().length === 0 && (
          <p className="text-xs text-red-400">El nombre es obligatorio</p>
        )}
      </div>

      {/* Tipo (editable) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "#869489" }}>
          Tipo de agente
        </label>
        <TipoAgenteSelector
          value={tipo}
          onChange={(nuevoTipo) => setTipo(nuevoTipo)}
        />
      </div>

      {/* Botón guardar */}
      <div className="flex items-center gap-3">
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
    </form>
  );
}
