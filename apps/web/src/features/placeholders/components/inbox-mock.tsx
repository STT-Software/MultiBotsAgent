const MOCK_CONVERSACIONES = [
  { id: 1, nombre: "María García", mensaje: "Hola, necesito información sobre el plan premium...", hora: "10:32", noLeidos: 2 },
  { id: 2, nombre: "Carlos López", mensaje: "¿Cuándo estará disponible mi pedido?", hora: "09:15", noLeidos: 0 },
  { id: 3, nombre: "Ana Martínez", mensaje: "Gracias por la ayuda, todo quedó claro", hora: "Ayer", noLeidos: 0 },
  { id: 4, nombre: "Pedro Sánchez", mensaje: "Quisiera agendar una cita para el viernes...", hora: "Ayer", noLeidos: 5 },
];

export function InboxMock() {
  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{ border: "1px solid #3c4a41", backgroundColor: "#1a1f1c" }}
    >
      {MOCK_CONVERSACIONES.map((conv, i) => (
        <div
          key={conv.id}
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: i < MOCK_CONVERSACIONES.length - 1 ? "1px solid #3c4a41" : "none" }}
        >
          {/* Avatar */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{ backgroundColor: "#242c27", color: "#bbcabe" }}
          >
            {conv.nombre.charAt(0)}
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "#dde5dc" }}>
                {conv.nombre}
              </span>
              <span className="text-[10px]" style={{ color: "#869489" }}>
                {conv.hora}
              </span>
            </div>
            <span className="truncate text-[11px]" style={{ color: "#869489" }}>
              {conv.mensaje}
            </span>
          </div>

          {/* Badge no leídos */}
          {conv.noLeidos > 0 && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ backgroundColor: "#00bb7a", color: "#0a0a0a" }}
            >
              {conv.noLeidos}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
