const MOCK_PEDIDOS = [
  { id: "PED-001", cliente: "María García", producto: "Plan Premium Anual", estado: "completado", fecha: "15 may 2026" },
  { id: "PED-002", cliente: "Carlos López", producto: "Módulo Cotizador", estado: "pendiente", fecha: "14 may 2026" },
  { id: "PED-003", cliente: "Ana Martínez", producto: "Pack Agentes x3", estado: "enviado", fecha: "13 may 2026" },
  { id: "PED-004", cliente: "Pedro Sánchez", producto: "Plan Básico Mensual", estado: "pendiente", fecha: "12 may 2026" },
];

const ESTADO_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  completado: { bg: "#1a3d2f", text: "#7df0c8", border: "#2d6e5a" },
  pendiente: { bg: "#2a2e2b", text: "#f0c87d", border: "#5c4a10" },
  enviado: { bg: "#1e2a35", text: "#7db8f0", border: "#3a5068" },
};

export function PedidosMock() {
  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{ border: "1px solid #3c4a41", backgroundColor: "#1a1f1c" }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr] gap-3 px-4 py-2.5"
        style={{ borderBottom: "1px solid #3c4a41" }}
      >
        {["ID", "Cliente", "Producto", "Estado", "Fecha"].map((col) => (
          <span
            key={col}
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "#869489" }}
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
            className="grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr] gap-3 items-center px-4 py-2.5"
            style={{ borderBottom: i < MOCK_PEDIDOS.length - 1 ? "1px solid #3c4a41" : "none" }}
          >
            <span className="text-[11px] font-mono" style={{ color: "#bbcabe" }}>
              {pedido.id}
            </span>
            <span className="text-xs" style={{ color: "#dde5dc" }}>
              {pedido.cliente}
            </span>
            <span className="text-xs" style={{ color: "#bbcabe" }}>
              {pedido.producto}
            </span>
            <span
              className="inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[10px] font-medium capitalize"
              style={{
                backgroundColor: estiloEstado.bg,
                color: estiloEstado.text,
                border: `1px solid ${estiloEstado.border}`,
              }}
            >
              {pedido.estado}
            </span>
            <span className="text-[11px]" style={{ color: "#869489" }}>
              {pedido.fecha}
            </span>
          </div>
        );
      })}
    </div>
  );
}
