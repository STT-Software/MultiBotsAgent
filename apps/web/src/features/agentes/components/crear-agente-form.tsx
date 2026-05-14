"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, X } from "lucide-react";

import { Field } from "@/components/ui/Field";
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
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
      <Field id="nombre" label="Nombre del agente" required error={validationErrors.nombre}>
        <input
          id="nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Asistente de ventas"
          aria-describedby={validationErrors.nombre ? "nombre-error" : undefined}
          aria-invalid={!!validationErrors.nombre}
          className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-500 focus:ring-1"
          style={{
            backgroundColor: "#111d17",
            border: "1px solid #3c4a41",
            color: "#e8f0ea",
            // @ts-expect-error -- CSS custom property for focus ring
            "--tw-ring-color": "#00bb7a",
          }}
        />
      </Field>

      {/* Selector de tipo */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-300">
          Tipo de agente <span className="text-red-400">*</span>
        </label>
        <TipoAgenteSelector
          value={tipo}
          onChange={setTipo}
          error={validationErrors.tipo}
        />
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/agentes"
          className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
          style={{
            border: "1px solid #3c4a41",
            color: "#bbcabe",
          }}
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          aria-disabled={loading}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#00bb7a", color: "#004329" }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Creando...
            </>
          ) : (
            "Crear agente"
          )}
        </button>
      </div>
    </form>
  );
}
