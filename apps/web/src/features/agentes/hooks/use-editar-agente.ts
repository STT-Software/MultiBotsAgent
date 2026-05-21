"use client";

import { useCallback, useState } from "react";

import { Agente, UpdateAgenteDTO } from "../types/agentes.types";
import { updateAgente } from "../services/agentes.service";

interface UseEditarAgenteReturn {
  editarAgente: (dto: UpdateAgenteDTO) => Promise<void>;
  saving: boolean;
  error: string | null;
  success: boolean;
  resetStatus: () => void;
}

export function useEditarAgente(
  agente: Agente,
  onUpdate: (agenteActualizado: Agente) => void
): UseEditarAgenteReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const editarAgente = useCallback(
    async (dto: UpdateAgenteDTO) => {
      setSaving(true);
      setError(null);
      setSuccess(false);

      try {
        const agenteActualizado = await updateAgente(agente.id, dto);
        onUpdate(agenteActualizado);
        setSuccess(true);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al actualizar el agente. Intenta nuevamente.";
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [agente.id, onUpdate]
  );

  const resetStatus = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return { editarAgente, saving, error, success, resetStatus };
}
