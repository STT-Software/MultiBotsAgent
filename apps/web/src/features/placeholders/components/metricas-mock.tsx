const MOCK_CARDS = [
  { label: "Conversaciones", valor: "1,234", cambio: "+18% vs semana anterior" },
  { label: "Tiempo respuesta", valor: "2.3s", cambio: "-0.4s vs semana anterior" },
  { label: "Satisfacción", valor: "94%", cambio: "+2% vs semana anterior" },
];

const MOCK_BARRAS = [
  { label: "Lun", altura: 60 },
  { label: "Mar", altura: 80 },
  { label: "Mié", altura: 45 },
  { label: "Jue", altura: 90 },
  { label: "Vie", altura: 70 },
  { label: "Sáb", altura: 35 },
  { label: "Dom", altura: 25 },
];

export function MetricasMock() {
  return (
    <div className="flex flex-col gap-4">
      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        {MOCK_CARDS.map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-1.5 rounded-lg p-4"
            style={{ backgroundColor: "#1a1f1c", border: "1px solid #3c4a41" }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#869489" }}>
              {card.label}
            </span>
            <span className="text-xl font-bold" style={{ color: "#dde5dc" }}>
              {card.valor}
            </span>
            <span className="text-[10px]" style={{ color: "#49df9a" }}>
              {card.cambio}
            </span>
          </div>
        ))}
      </div>

      {/* Gráfico de barras simulado */}
      <div
        className="flex flex-col gap-3 rounded-lg p-4"
        style={{ backgroundColor: "#1a1f1c", border: "1px solid #3c4a41" }}
      >
        <span className="text-xs font-medium" style={{ color: "#bbcabe" }}>
          Conversaciones por día
        </span>
        <div className="flex items-end justify-between gap-2" style={{ height: "100px" }}>
          {MOCK_BARRAS.map((barra) => (
            <div key={barra.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${barra.altura}%`,
                  backgroundColor: "#00bb7a",
                  opacity: 0.7,
                }}
              />
              <span className="text-[9px]" style={{ color: "#869489" }}>
                {barra.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
