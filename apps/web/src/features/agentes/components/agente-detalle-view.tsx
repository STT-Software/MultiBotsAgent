"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Agente } from "../types/agentes.types";
import { useAgenteDetalle } from "../hooks/use-agente-detalle";
import { AgenteDetalleSkeleton } from "./agente-detalle-skeleton";
import { AgenteDetalleTabs } from "./agente-detalle-tabs";

interface AgenteDetalleViewProps {
  id: string;
}

export function AgenteDetalleView({ id }: AgenteDetalleViewProps) {
  const router = useRouter();
  const { agente: agenteInicial, loading, error, notFound } = useAgenteDetalle(id);
  const [agente, setAgente] = useState<Agente | null>(null);

  // Sincronizar agente local con el del hook
  useEffect(() => {
    if (agenteInicial) {
      setAgente(agenteInicial);
    }
  }, [agenteInicial]);

  // Redirigir si no se encuentra el agente
  useEffect(() => {
    if (notFound) {
      router.replace("/agentes");
    }
  }, [notFound, router]);

  const handleAgenteUpdate = useCallback((agenteActualizado: Agente) => {
    setAgente(agenteActualizado);
  }, []);

  if (loading) {
    return <AgenteDetalleSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm" style={{ color: "#f87171" }}>
          {error}
        </p>
        <button
          onClick={() => router.refresh()}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "#1a2f23",
            color: "#00bb7a",
            border: "1px solid #3c4a41",
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!agente) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header con botón volver */}
      <div className="flex items-center gap-4">
        <Link
          href="/agentes"
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          style={{ color: "#bbcabe", border: "1px solid #3c4a41" }}
          aria-label="Volver al listado de agentes"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold" style={{ color: "#e8f0ea" }}>
            {agente.nombre}
          </h1>
          <span
            className="text-xs"
            style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
          >
            ID: {agente.codigoId}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <AgenteDetalleTabs agente={agente} onAgenteUpdate={handleAgenteUpdate} />
    </div>
  );
}
