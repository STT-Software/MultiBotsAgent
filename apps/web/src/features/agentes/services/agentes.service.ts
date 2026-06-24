import { fetchWithAuth } from "@/lib/auth";
import { Agente, AgentesResponse, AgentesMetrics, CreateAgenteDTO, UpdateAgenteDTO } from "../types/agentes.types";

const MOCK_METRICS: AgentesMetrics = {
  agentesActivos: 24,
  cambioSemanal: "+12% esta semana",
  latenciaMedia: "342ms",
  latenciaEstado: "Dentro del SLA",
  tokenUsage: "1.2M",
  tokenEstado: "Cerca del límite",
};

/**
 * Obtiene el listado de agentes reales del backend NestJS.
 */
export async function fetchAgentes(): Promise<AgentesResponse> {
  const res = await fetchWithAuth("/agents");
  if (!res.ok) {
    throw new Error(`Error al obtener agentes: ${res.status}`);
  }
  const data = await res.json();
  return { data };
}

/**
 * Obtiene métricas simuladas (pendiente de implementar en backend).
 */
export async function fetchAgentesMetrics(): Promise<AgentesMetrics> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_METRICS;
}

/**
 * Crea un agente real en el backend.
 */
export async function createAgente(dto: CreateAgenteDTO): Promise<Agente> {
  const res = await fetchWithAuth("/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    throw new Error(`Error al crear el agente: ${res.status}`);
  }

  return res.json();
}

/**
 * Obtiene la información real de un agente por ID.
 */
export async function fetchAgenteById(id: string): Promise<Agente | null> {
  const res = await fetchWithAuth(`/agents/${id}`);
  
  if (res.status === 404) {
    return null;
  }
  
  if (!res.ok) {
    throw new Error(`Error al obtener el agente: ${res.status}`);
  }

  return res.json();
}

/**
 * Actualiza la información real y de personalidad del agente por ID.
 */
export async function updateAgente(id: string, dto: UpdateAgenteDTO): Promise<Agente> {
  const res = await fetchWithAuth(`/agents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    throw new Error(`Error al actualizar el agente: ${res.status}`);
  }

  return res.json();
}

/**
 * Elimina un agente real por ID.
 */
export async function deleteAgente(id: string): Promise<void> {
  const res = await fetchWithAuth(`/agents/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Error al eliminar el agente: ${res.status}`);
  }
}
