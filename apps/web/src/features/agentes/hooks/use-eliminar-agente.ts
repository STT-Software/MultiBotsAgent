"use client";

import { useCallback, useState } from "react";

import { Agente } from "../types/agentes.types";
import { deleteAgente } from "../services/agentes.service";

interface UseEliminarAgenteReturn {
  isOpen: boolean;
  agenteSeleccionado: Agente | null;
  abrir: (agente: Agente) => void;
  cerrar: () => void;
  confirmar: () => Promise<void>;
  deleting: boolean;
  error: string | null;
  success: boolean;
}

export function useEliminarAgente(onSuccess?: () => void): UseEliminarAgenteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<Agente | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const abrir = useCallback((agente: Agente) => {
    setAgenteSeleccionado(agente);
    setIsOpen(true);
    setError(null);
    setSuccess(false);
  }, []);

  const cerrar = useCallback(() => {
    if (deleting) return;
    setIsOpen(false);
    setAgenteSeleccionado(null);
    setError(null);
  }, [deleting]);

  const confirmar = useCallback(async () => {
    if (!agenteSeleccionado) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteAgente(agenteSeleccionado.id);
      setSuccess(true);
      setIsOpen(false);
      setAgenteSeleccionado(null);
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al eliminar el agente. Intenta nuevamente.";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }, [agenteSeleccionado, onSuccess]);

  return {
    isOpen,
    agenteSeleccionado,
    abrir,
    cerrar,
    confirmar,
    deleting,
    error,
    success,
  };
}
