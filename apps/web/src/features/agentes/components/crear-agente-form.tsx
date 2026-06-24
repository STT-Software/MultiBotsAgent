"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, Bot, Loader2, Plus, X } from "lucide-react";
import { useCrearAgente } from "../hooks/use-crear-agente";
import { TipoAgenteSelector } from "./tipo-agente-selector";
import { Input } from "@/components/ui/Input";
import { motion, AnimatePresence } from "motion/react";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-lg mx-auto">
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex items-center gap-3 rounded-lg px-4 py-3 border border-red-500/30 bg-red-500/10"
            role="alert"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campo nombre */}
      <div className="space-y-1.5">
        <label
          htmlFor="nombre"
          className="block text-sm font-medium text-gray-300"
        >
          Nombre del agente
        </label>
        <div className="relative">
          <Input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Asistente de Soporte"
            aria-describedby={validationErrors.nombre ? "nombre-error" : undefined}
            aria-invalid={!!validationErrors.nombre}
            hasError={!!validationErrors.nombre}
            className="pl-10"
          />
          <Bot size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" aria-hidden="true" />
        </div>
        <AnimatePresence>
          {validationErrors.nombre ? (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              id="nombre-error"
              role="alert"
              className="text-xs text-red-400 mt-1"
            >
              {validationErrors.nombre}
            </motion.p>
          ) : nombre.trim().length > 0 ? (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 text-xs text-emerald-400 mt-1"
            >
              <span>✓</span> VALIDACIÓN: NOMBRE DISPONIBLE
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Selector de tipo */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold uppercase tracking-wide text-gray-300">
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
        <motion.button
          type="submit"
          whileHover={isDisabled ? {} : { scale: 1.01, translateY: -1 }}
          whileTap={isDisabled ? {} : { scale: 0.99 }}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold uppercase tracking-wide transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg hover:shadow-emerald-500/20"
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
        </motion.button>

        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Link
            href="/agentes"
            className="inline-flex w-full items-center justify-center rounded-lg py-3 text-sm font-medium uppercase tracking-wide border border-gray-800 bg-transparent text-gray-400 hover:text-white hover:border-gray-700 transition-colors"
          >
            Cancelar
          </Link>
        </motion.div>
      </div>
    </form>
  );
}
