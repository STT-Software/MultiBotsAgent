import { Agente, AgentesResponse, AgentesMetrics } from "../types/agentes.types";

const MOCK_AGENTES: Agente[] = [
  {
    id: "1",
    nombre: "Asistente Ventas",
    codigoId: "agt_vnt_092",
    tipo: "rag",
    estado: "activo",
    vencimiento: "1 may 2026",
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "2",
    nombre: "Cotizador Express",
    codigoId: "agt_ctx_114",
    tipo: "cotizador",
    estado: "activo",
    vencimiento: "3 may 2026",
    createdAt: "2026-05-03T14:30:00Z",
  },
  {
    id: "3",
    nombre: "Agenda Citas",
    codigoId: "agt_agc_551",
    tipo: "agendamiento",
    estado: "borrador",
    vencimiento: "5 may 2026",
    createdAt: "2026-05-05T09:15:00Z",
  },
  {
    id: "4",
    nombre: "Soporte Técnico",
    codigoId: "agt_tec_381",
    tipo: "rag",
    estado: "borrador",
    vencimiento: "7 may 2026",
    createdAt: "2026-05-07T16:45:00Z",
  },
];

const MOCK_METRICS: AgentesMetrics = {
  agentesActivos: 24,
  cambioSemanal: "+12% esta semana",
  latenciaMedia: "342ms",
  latenciaEstado: "Dentro del SLA",
  tokenUsage: "1.2M",
  tokenEstado: "Cerca del límite",
};

// TODO: Reemplazar mock por fetch real a GET /api/agentes cuando el backend esté disponible
export async function fetchAgentes(): Promise<AgentesResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { data: MOCK_AGENTES };
}

// TODO: Reemplazar mock por fetch real a GET /api/agentes/metrics
export async function fetchAgentesMetrics(): Promise<AgentesMetrics> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return MOCK_METRICS;
}
