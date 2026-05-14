export interface Agente {
  id: string;
  nombre: string;
  codigoId: string;
  tipo: "rag" | "cotizador" | "agendamiento";
  estado: "borrador" | "activo";
  vencimiento: string;
  createdAt: string;
}

export interface AgentesResponse {
  data: Agente[];
}

export interface AgentesMetrics {
  agentesActivos: number;
  cambioSemanal: string;
  latenciaMedia: string;
  latenciaEstado: string;
  tokenUsage: string;
  tokenEstado: string;
}
