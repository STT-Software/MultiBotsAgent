import type { PersonalityConfig } from "@multibotagents/types";

export interface Agente {
  id: string;
  nombre: string;
  codigoId: string;
  tipo: "rag" | "cotizador" | "agendamiento";
  estado: "borrador" | "activo";
  vencimiento: string;
  createdAt: string;
  language?: string;
  welcomeMessage?: string;
  personality?: PersonalityConfig;
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

// DTO para crear un agente
export interface CreateAgenteDTO {
  nombre: string;
  tipo: "rag" | "cotizador" | "agendamiento";
}

// DTO para actualizar un agente
export interface UpdateAgenteDTO {
  nombre?: string;
  tipo?: "rag" | "cotizador" | "agendamiento";
  language?: string;
  welcomeMessage?: string;
  personality?: Partial<PersonalityConfig>;
  estado?: "borrador" | "activo";
}

// Errores de validación del formulario de creación
export interface CrearAgenteValidationErrors {
  nombre?: string;
  tipo?: string;
}

// Metadata de cada tipo de agente (para el selector visual)
export interface TipoAgenteOption {
  value: "rag" | "cotizador" | "agendamiento";
  label: string;
  description: string;
  icon: string;
}
