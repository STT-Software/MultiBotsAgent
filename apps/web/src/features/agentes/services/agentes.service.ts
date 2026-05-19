import { Agente, AgentesResponse, AgentesMetrics, CreateAgenteDTO, UpdateAgenteDTO } from "../types/agentes.types";

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

const TIPO_PREFIJO: Record<string, string> = {
  rag: "rag",
  cotizador: "ctx",
  agendamiento: "agc",
};

// TODO: Reemplazar mock por fetch real a POST /api/agentes cuando el backend esté disponible
export async function createAgente(dto: CreateAgenteDTO): Promise<Agente> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Simular error en desarrollo: si nombre contiene "error", lanza excepción
  if (dto.nombre.toLowerCase().includes("error")) {
    throw new Error("Error simulado en la creación del agente.");
  }

  const prefijo = TIPO_PREFIJO[dto.tipo];
  const randomDigits = Math.floor(Math.random() * 900 + 100).toString();

  const nuevoAgente: Agente = {
    id: crypto.randomUUID(),
    nombre: dto.nombre.trim(),
    codigoId: `agt_${prefijo}_${randomDigits}`,
    tipo: dto.tipo,
    estado: "borrador",
    vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
      "es-ES",
      { day: "numeric", month: "short", year: "numeric" }
    ),
    createdAt: new Date().toISOString(),
  };

  return nuevoAgente;
}

// TODO: Reemplazar mock por fetch real a GET /api/agentes/:id cuando el backend esté disponible
export async function fetchAgenteById(id: string): Promise<Agente | null> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const agente = MOCK_AGENTES.find((a) => a.id === id);
  return agente ?? null;
}

// TODO: Reemplazar mock por fetch real a PATCH /api/agentes/:id cuando el backend esté disponible
export async function updateAgente(id: string, dto: UpdateAgenteDTO): Promise<Agente> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Simular error: si nombre contiene "error", lanza excepción (mismo patrón que createAgente)
  if (dto.nombre && dto.nombre.toLowerCase().includes("error")) {
    throw new Error("Error simulado en la actualización del agente.");
  }

  const index = MOCK_AGENTES.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new Error("Agente no encontrado.");
  }

  if (dto.nombre !== undefined) {
    MOCK_AGENTES[index].nombre = dto.nombre.trim();
  }
  if (dto.tipo !== undefined) {
    MOCK_AGENTES[index].tipo = dto.tipo;
  }

  return { ...MOCK_AGENTES[index] };
}
