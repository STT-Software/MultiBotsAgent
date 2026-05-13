import { Agente, AgentesResponse } from "../types/agentes.types";

const MOCK_AGENTES: Agente[] = [
  {
    id: "1",
    nombre: "Asistente Ventas",
    tipo: "rag",
    estado: "activo",
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "2",
    nombre: "Cotizador Express",
    tipo: "cotizador",
    estado: "activo",
    createdAt: "2026-05-03T14:30:00Z",
  },
  {
    id: "3",
    nombre: "Agenda Citas",
    tipo: "agendamiento",
    estado: "borrador",
    createdAt: "2026-05-05T09:15:00Z",
  },
  {
    id: "4",
    nombre: "Soporte Técnico",
    tipo: "rag",
    estado: "borrador",
    createdAt: "2026-05-07T16:45:00Z",
  },
];

// TODO: Reemplazar mock por fetch real a GET /api/agentes cuando el backend esté disponible
export async function fetchAgentes(): Promise<AgentesResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { data: MOCK_AGENTES };
}
