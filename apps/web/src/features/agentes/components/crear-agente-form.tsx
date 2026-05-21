"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, Bot, Loader2, Plus, X } from "lucide-react";

import { useCrearAgente } from "../hooks/use-crear-agente";
import { TipoAgenteSelector } from "./tipo-agente-selector";

export function CrearAgenteForm() {
  const {
    nombre,
    setNombre,
    tipo,
    setTipo,
    loading,
    error,
    validationErrors,
    submit,
    resetError,
  } = useCrearAgente();

  // El botón se habilita solo cuando nombre y tipo están llenos
  const isFormValid = nombre.trim().length > 0 && tipo !== "";
  const isDisabled = !isFormValid || loading;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Error banner */}
      {error && (
        <div
          className="flex items-center gap-3 rounded-lg px-4 py-3"
          role="alert"
          style={{ backgroundColor: "#2d1b1b", border: "1px solid #5c2b2b" }}
        >
          <AlertCircle size={18} className="shrink-0 text-red-400" aria-hidden="true" />
          <p className="flex-1 text-sm text-red-300">{error}</p>
          <button
            type="button"
            onClick={resetError}
            className="shrink-0 rounded p-1 text-red-400 transition-colors hover:text-red-300"
            aria-label="Cerrar mensaje de error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Campo nombre */}
      <div className="space-y-1.5">
        <label
          htmlFor="nombre"
          className="block text-sm font-medium"
          style={{ color: "#e8f0ea" }}
        >
          Nombre del agente
        </label>
        <div
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{
            backgroundColor: "#0e1510",
            border: "1px solid #3c4a41",
          }}
        >
          <Bot size={18} style={{ color: "#869489" }} aria-hidden="true" />
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Asistente de Soporte"
            aria-describedby={validationErrors.nombre ? "nombre-error" : undefined}
            aria-invalid={!!validationErrors.nombre}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
            style={{ color: "#e8f0ea" }}
          />
        </div>
        {validationErrors.nombre ? (
          <p id="nombre-error" role="alert" className="text-xs text-red-400">
            {validationErrors.nombre}
          </p>
        ) : nombre.trim().length > 0 ? (
          <p className="flex items-center gap-1 text-xs" style={{ color: "#00bb7a" }}>
            <span>✓</span> VALIDACIÓN: NOMBRE DISPONIBLE
          </p>
        ) : null}
      </div>

      {/* Selector de tipo */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold uppercase tracking-wide" style={{ color: "#e8f0ea" }}>
          Tipo de agente
        </label>
        <TipoAgenteSelector
          value={tipo}
          onChange={setTipo}
          error={validationErrors.tipo}
        />
      </div>

      {/* Botones full-width */}
      <div className="flex flex-col gap-3 pt-4">
        <button
          type="submit"
          disabled={isDisabled}
          aria-disabled={isDisabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor: isDisabled ? "#065f3e" : "#00bb7a",
            color: isDisabled ? "#0a2e1e" : "#004329",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Creando...
            </>
          ) : (
            <>
              <Plus size={16} aria-hidden="true" />
              Crear Agente
            </>
          )}
        </button>

        <Link
          href="/agentes"
          className="inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors"
          style={{
            border: "1px solid #3c4a41",
            color: "#bbcabe",
            backgroundColor: "transparent",
          }}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
