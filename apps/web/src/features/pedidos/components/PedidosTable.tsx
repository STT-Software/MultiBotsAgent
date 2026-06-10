import { ShoppingCart, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { UiOrder } from "../hooks/use-pedidos";

interface PedidosTableProps {
  pedidos: UiOrder[];
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const ESTADO_STYLES: Record<UiOrder["estado"], { bg: string; text: string; border: string }> = {
  procesando: { bg: "#1a3d2f", text: "#7df0c8", border: "#2d6e5a" },
  pendiente: { bg: "#2a2410", text: "#f0c87d", border: "#5c4a10" },
  completado: { bg: "#1e2a35", text: "#7db8f0", border: "#3a5068" },
  cancelado: { bg: "#2d1b1b", text: "#f0a0a0", border: "#5c2b2b" },
};

export function PedidosTable({ pedidos, onCancel, onComplete, onDelete }: PedidosTableProps) {
  return (
    <div
      className="w-full rounded-lg overflow-hidden border"
      style={{ backgroundColor: "#1a211c", borderColor: "#3c4a41" }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-[0.8fr_2fr_1fr_1fr_1.5fr_1.5fr_1.7fr] gap-4 px-5 py-3"
        style={{ borderBottom: "1px solid #3c4a41" }}
      >
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          ID
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Nombre del Pedido / Cliente
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Total
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Estado
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Creado por (Agente)
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider text-right"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Fecha
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider text-center"
          style={{ color: "#869489", fontFamily: "JetBrains Mono, monospace" }}
        >
          Acciones
        </span>
      </div>

      {/* Rows */}
      {pedidos.map((pedido, index) => {
        const estiloEstado = ESTADO_STYLES[pedido.estado] || ESTADO_STYLES.pendiente;
        return (
          <div
            key={pedido.id}
            className="grid grid-cols-[0.8fr_2fr_1fr_1fr_1.5fr_1.5fr_1.7fr] gap-4 items-center px-5 py-4 transition-colors"
            style={{
              borderBottom: index < pedidos.length - 1 ? "1px solid #242c27" : "none",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#242c27")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            {/* ID */}
            <span
              className="text-xs font-medium font-mono"
              style={{ color: "#869489" }}
            >
              #{pedido.id.substring(pedido.id.length - 6).toUpperCase()}
            </span>

            {/* Nombre del Pedido / Cliente */}
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded bg-[#242c27]"
                style={{ border: "1px solid #3c4a41" }}
              >
                <ShoppingCart size={14} style={{ color: "#00bb7a" }} aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold truncate" style={{ color: "#dde5dc" }}>
                {pedido.cliente}
              </span>
            </div>

            {/* Total */}
            <span className="text-sm font-medium" style={{ color: "#dde5dc" }}>
              {pedido.total}
            </span>

            {/* Estado */}
            <div>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: estiloEstado.bg,
                  color: estiloEstado.text,
                  border: `1px solid ${estiloEstado.border}`,
                }}
              >
                {pedido.estado}
              </span>
            </div>

            {/* Agente */}
            <span className="text-xs font-medium" style={{ color: "#bbcabe" }}>
              {pedido.agenteName}
            </span>

            {/* Fecha */}
            <span className="text-xs text-right" style={{ color: "#869489" }}>
              {pedido.fecha}
            </span>

            {/* Acciones */}
            <div className="flex items-center justify-center gap-2">
              {pedido.estado !== "completado" && pedido.estado !== "cancelado" ? (
                <>
                  <button
                    onClick={() => onComplete(pedido.id)}
                    title="Completar Pedido"
                    className="flex h-7 items-center justify-center gap-1 rounded px-2 text-[10px] font-semibold transition-all hover:opacity-90 active:scale-95"
                    style={{
                      backgroundColor: "#1e2a35",
                      border: "1px solid #3a5068",
                      color: "#7db8f0",
                      cursor: "pointer",
                    }}
                  >
                    <CheckCircle size={11} />
                    Completar
                  </button>
                  <button
                    onClick={() => onCancel(pedido.id)}
                    title="Cancelar Pedido"
                    className="flex h-7 items-center justify-center gap-1 rounded px-2 text-[10px] font-semibold transition-all hover:opacity-90 active:scale-95"
                    style={{
                      backgroundColor: "#2d1b1b",
                      border: "1px solid #5c2b2b",
                      color: "#f0a0a0",
                      cursor: "pointer",
                    }}
                  >
                    <XCircle size={11} />
                    Cancelar
                  </button>
                </>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: "#1c211e", border: "1px solid #28332c", color: "#6e8073" }}>
                  Finalizado
                </span>
              )}
              <button
                onClick={() => {
                  if (confirm("¿Estás seguro de que deseas eliminar este pedido permanentemente? Esta acción no se puede deshacer.")) {
                    onDelete(pedido.id);
                  }
                }}
                title="Eliminar Pedido"
                className="flex h-7 w-7 items-center justify-center rounded transition-all hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: "#1c1212",
                  border: "1px solid #3c1e1e",
                  color: "#e57373",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
