import { MessageSquare, ShoppingCart, Bot, UserCheck } from "lucide-react";

const MOCK_EVENTOS = [
  { id: 1, icon: <MessageSquare size={14} aria-hidden="true" />, descripcion: "Conversación iniciada con María García", tiempo: "Hace 2 horas", color: "#7db8f0" },
  { id: 2, icon: <Bot size={14} aria-hidden="true" />, descripcion: "Agente RAG respondió automáticamente", tiempo: "Hace 2 horas", color: "#49df9a" },
  { id: 3, icon: <ShoppingCart size={14} aria-hidden="true" />, descripcion: "Pedido PED-001 creado por cotizador", tiempo: "Hace 5 horas", color: "#f0c87d" },
  { id: 4, icon: <UserCheck size={14} aria-hidden="true" />, descripcion: "Agente de agendamiento confirmó cita", tiempo: "Ayer", color: "#c87df0" },
];

export function HistorialMock() {
  return (
    <div className="flex flex-col">
      {MOCK_EVENTOS.map((evento, i) => (
        <div key={evento.id} className="flex gap-3">
          {/* Timeline line + dot */}
          <div className="flex flex-col items-center">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "#242c27", border: "1px solid #3c4a41" }}
            >
              <span style={{ color: evento.color }}>{evento.icon}</span>
            </div>
            {i < MOCK_EVENTOS.length - 1 && (
              <div className="w-px flex-1 min-h-[24px]" style={{ backgroundColor: "#3c4a41" }} />
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-0.5 pb-5">
            <span className="text-xs" style={{ color: "#dde5dc" }}>
              {evento.descripcion}
            </span>
            <span className="text-[10px]" style={{ color: "#869489" }}>
              {evento.tiempo}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
