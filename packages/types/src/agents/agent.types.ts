import { PersonalityConfig } from "../interfaces/rag-engine.interfaces";

export type AgentTipo = "rag" | "cotizador" | "agendamiento";
export type AgentEstado = "activo" | "borrador";

/**
 * Entidad de dominio Agent.
 * Representa la configuración y personalidad de un agente en el sistema.
 */
export interface Agent {
  id: string;
  companyId: string;
  nombre: string;
  tipo: AgentTipo;
  estado: AgentEstado;
  instrucciones?: string; // Fallback antiguo para compatibilidad
  relevanceThreshold: number;
  topK: number;
  maxResponseLength: number;
  memoryWindow: number;
  welcomeMessage?: string;
  noInfoMessage: string;
  errorMessage: string;
  language: string;
  failedAttemptsBeforeEscalation?: number;
  personality: PersonalityConfig;
  createdAt: Date;
  updatedAt: Date;
}
