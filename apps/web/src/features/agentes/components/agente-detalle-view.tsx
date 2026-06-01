"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, CheckCircle } from "lucide-react";
import Link from "next/link";

import { Agente } from "../types/agentes.types";
import { useAgenteDetalle } from "../hooks/use-agente-detalle";
import { useEliminarAgente } from "../hooks/use-eliminar-agente";
import { AgenteDetalleSkeleton } from "./agente-detalle-skeleton";
import { AgenteDetalleTabs } from "./agente-detalle-tabs";
import { EliminarAgenteDialog } from "./eliminar-agente-dialog";

interface AgenteDetalleViewProps {
  id: string;
}

export function AgenteDetalleView({ id }: AgenteDetalleViewProps) {
  const router = useRouter();
  const { agente: agenteInicial, loading, error, notFound } = useAgenteDetalle(id);
  const [agente, setAgente] = useState<Agente | null>(null);

  const eliminar = useEliminarAgente(() => {
    router.push("/agentes");
  });

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
      {/* Header con botón volver y eliminar */}
      <div className="flex items-center justify-between">
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
              ID: {agente.codigoId || agente.id}
            </span>
          </div>
        </div>

        {/* Botón eliminar */}
        <button
          type="button"
          onClick={() => eliminar.abrir(agente)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          style={{
            color: "#f87171",
            border: "1px solid #5c2a2a",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2d1a1a")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Trash2 size={14} aria-hidden="true" />
          Eliminar agente
        </button>
      </div>

      {/* Tabs */}
      <AgenteDetalleTabs agente={agente} onAgenteUpdate={handleAgenteUpdate} />

      {/* Toast de éxito */}
      {eliminar.success && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg"
          style={{ backgroundColor: "#1a3d2f", border: "1px solid #2d6e5a", color: "#49df9a" }}
        >
          <CheckCircle size={16} aria-hidden="true" />
          <span className="text-sm font-medium">Agente eliminado exitosamente</span>
        </div>
      )}

      {/* Diálogo de confirmación */}
      <EliminarAgenteDialog
        isOpen={eliminar.isOpen}
        agente={eliminar.agenteSeleccionado}
        deleting={eliminar.deleting}
        error={eliminar.error}
        onConfirm={eliminar.confirmar}
        onCancel={eliminar.cerrar}
      />
    </div>
  );
}
