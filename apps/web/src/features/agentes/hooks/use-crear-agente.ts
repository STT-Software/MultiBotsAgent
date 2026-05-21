"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createAgente } from "../services/agentes.service";
import { CrearAgenteValidationErrors } from "../types/agentes.types";

interface UseCrearAgenteReturn {
  nombre: string;
  setNombre: (value: string) => void;
  tipo: "rag" | "cotizador" | "agendamiento" | "";
  setTipo: (value: "rag" | "cotizador" | "agendamiento") => void;
  loading: boolean;
  error: string | null;
  validationErrors: CrearAgenteValidationErrors;
  submit: () => Promise<void>;
  resetError: () => void;
}

export function useCrearAgente(): UseCrearAgenteReturn {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"rag" | "cotizador" | "agendamiento" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<CrearAgenteValidationErrors>({});

  function validate(): CrearAgenteValidationErrors {
    const errors: CrearAgenteValidationErrors = {};

    if (!nombre.trim()) {
      errors.nombre = "El nombre del agente es obligatorio";
    }

    if (!tipo) {
      errors.tipo = "Selecciona un tipo de agente";
    }

    return errors;
  }

  async function submit(): Promise<void> {
    const errors = validate();

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setError(null);
    setLoading(true);

    try {
      await createAgente({ nombre, tipo: tipo as "rag" | "cotizador" | "agendamiento" });
      router.push("/agentes");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al crear el agente. Intenta nuevamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function resetError(): void {
    setError(null);
  }

  return {
    nombre,
    setNombre,
    tipo,
    setTipo,
    loading,
    error,
    validationErrors,
    submit,
    resetError,
  };
}
