"use client";

import { ShoppingCart, RefreshCw, AlertCircle } from "lucide-react";
import { usePedidos } from "../hooks/use-pedidos";
import { PedidosTable } from "./PedidosTable";

export function PedidosContainer() {
  const { pedidos, loading, error, refetch, changeStatus, deleteOrder } = usePedidos();

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "#dde5dc" }}
            >
              Listado de Pedidos
            </h1>
            {!loading && !error && pedidos.length > 0 && (
              <span
                className="inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-semibold"
                style={{ backgroundColor: "#242c27", color: "#00bb7a", border: "1px solid #3c4a41" }}
              >
                {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm" style={{ color: "#bbcabe" }}>
            Administra, visualiza e inspecciona las cotizaciones y pedidos generados por tus agentes en tiempo real.
          </p>
        </div>

        <button
          onClick={refetch}
          disabled={loading}
          className="flex h-9 items-center justify-center gap-2 rounded-md border px-4 text-xs font-semibold transition-all hover:bg-[#242c27]"
          style={{
            backgroundColor: "#16221d",
            borderColor: "#3c4a41",
            color: "#dde5dc",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ color: "#00bb7a" }} />
          Actualizar
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <PedidosListSkeleton />
      ) : error ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center"
          style={{ backgroundColor: "#1e1313", borderColor: "#5c2b2b" }}
        >
          <AlertCircle size={28} style={{ color: "#f0a0a0" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#f0a0a0" }}>
            Ha ocurrido un problema
          </h3>
          <p className="text-xs max-w-md" style={{ color: "#e3b3b3" }}>
            {error}
          </p>
          <button
            onClick={refetch}
            className="mt-2 rounded px-3 py-1.5 text-xs font-medium bg-[#5c2b2b] text-white hover:bg-[#723636]"
          >
            Reintentar
          </button>
        </div>
      ) : pedidos.length === 0 ? (
        <PedidosEmptyState />
      ) : (
        <PedidosTable
          pedidos={pedidos}
          onCancel={(id) => changeStatus(id, "cancelled")}
          onComplete={(id) => changeStatus(id, "delivered")}
          onDelete={(id) => deleteOrder(id)}
        />
      )}
    </div>
  );
}

function PedidosListSkeleton() {
  return (
    <div
      className="w-full overflow-hidden rounded-lg border"
      style={{ backgroundColor: "#1a211c", borderColor: "#3c4a41" }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-[1fr_2.5fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-4 px-5 py-3"
        style={{ borderBottom: "1px solid #3c4a41" }}
      >
        <div className="h-3 w-10 rounded bg-[#242c27]" />
        <div className="h-3 w-36 rounded bg-[#242c27]" />
        <div className="h-3 w-16 rounded bg-[#242c27]" />
        <div className="h-3 w-16 rounded bg-[#242c27]" />
        <div className="h-3 w-24 rounded bg-[#242c27]" />
        <div className="h-3 w-16 rounded bg-[#242c27]" />
      </div>

      {/* Row skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_2.5fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-4 items-center px-5 py-4"
          style={{ borderBottom: "1px solid #3c4a41" }}
        >
          <div className="h-3.5 w-12 animate-pulse rounded bg-[#242c27]" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 animate-pulse rounded bg-[#242c27]" />
            <div className="h-4 w-36 animate-pulse rounded bg-[#242c27]" />
          </div>
          <div className="h-4 w-16 animate-pulse rounded bg-[#242c27]" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-[#242c27]" />
          <div className="h-4 w-24 animate-pulse rounded bg-[#242c27]" />
          <div className="h-4 w-20 animate-pulse rounded bg-[#242c27]" />
        </div>
      ))}
    </div>
  );
}

function PedidosEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 border border-dashed rounded-lg" style={{ borderColor: "#3c4a41/50" }}>
      <div
        className="flex h-20 w-20 items-center justify-center rounded-xl"
        style={{ backgroundColor: "#242c27", border: "1px solid #3c4a41" }}
      >
        <ShoppingCart size={36} style={{ color: "#bbcabe" }} aria-hidden="true" />
      </div>

      <h2
        className="text-lg font-semibold"
        style={{ color: "#dde5dc", fontFamily: "Geist, sans-serif" }}
      >
        No hay pedidos registrados
      </h2>

      <p
        className="max-w-sm text-center text-sm leading-relaxed"
        style={{ color: "#bbcabe" }}
      >
        Los pedidos aparecerán aquí automáticamente cuando tus agentes cotizadores concreten compras o cotizaciones con tus clientes.
      </p>
    </div>
  );
}
