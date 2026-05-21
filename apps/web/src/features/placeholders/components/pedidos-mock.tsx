const MOCK_PEDIDOS = [
  { id: "#ORD-9821", cliente: "Neural Dynamics Corp", total: "$12,450.00", estado: "procesando" },
  { id: "#ORD-8842", cliente: "Cyberdyne Systems", total: "$8,120.50", estado: "pendiente" },
  { id: "#ORD-7751", cliente: "Omni Consumer Prod", total: "$24,000.00", estado: "completado" },
  { id: "#ORD-6629", cliente: "Weyland-Yutani", total: "$15,900.00", estado: "cancelado" },
];

const ESTADO_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  procesando: { bg: "#1a3d2f", text: "#7df0c8", border: "#2d6e5a" },
  pendiente: { bg: "#2a2410", text: "#f0c87d", border: "#5c4a10" },
  completado: { bg: "#1e2a35", text: "#7db8f0", border: "#3a5068" },
  cancelado: { bg: "#2d1b1b", text: "#f0a0a0", border: "#5c2b2b" },
};

export function PedidosMock() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{ backgroundColor: "#111916", border: "1px solid #3c4a41" }}
    >
      {/* Toolbar skeleton */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid #3c4a41" }}
      >
        <div className="h-3 w-28 rounded" style={{ backgroundColor: "#2f3731" }} />
        <div className="flex gap-2">
          <div className="h-7 w-16 rounded-md" style={{ backgroundColor: "#2f3731" }} />
          <div className="h-7 w-16 rounded-md" style={{ backgroundColor: "#2f3731" }} />
        </div>
      </div>

      {/* Table header */}
      <div
        className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 px-5 py-3"
        style={{ borderBottom: "1px solid #2f3731" }}
      >
        {["ID", "Cliente", "Total", "Estado"].map((col) => (
          <span
            key={col}
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "#5a6b5e" }}
          >
            {col}
          </span>
        ))}
      </div>

      {/* Rows */}
      {MOCK_PEDIDOS.map((pedido, i) => {
        const estiloEstado = ESTADO_STYLES[pedido.estado];
        return (
          <div
            key={pedido.id}
            className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 items-center px-5 py-3.5"
            style={{
              borderBottom: i < MOCK_PEDIDOS.length - 1 ? "1px solid #1e2520" : "none",
            }}
          >
            <span className="text-xs font-mono" style={{ color: "#869489" }}>
              {pedido.id}
            </span>
            <span className="text-sm" style={{ color: "#dde5dc" }}>
              {pedido.cliente}
            </span>
            <span className="text-sm font-medium" style={{ color: "#bbcabe" }}>
              {pedido.total}
            </span>
            <span
              className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                backgroundColor: estiloEstado.bg,
                color: estiloEstado.text,
                border: `1px solid ${estiloEstado.border}`,
              }}
            >
              {pedido.estado}
            </span>
          </div>
        );
      })}
    </div>
  );
}
