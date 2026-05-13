export interface Agente {
  id: string;
  nombre: string;
  tipo: "rag" | "cotizador" | "agendamiento";
  estado: "borrador" | "activo";
  createdAt: string;
}

export interface AgentesResponse {
  data: Agente[];
}
