export type AgenteTipo = 'rag' | 'cotizador' | 'agendamiento'

export type AgenteEstado = 'activo' | 'borrador'

export interface Agente {
  id: string
  empresaId: string
  nombre: string
  tipo: AgenteTipo
  estado: AgenteEstado
  createdAt: string
  updatedAt: string
}

export interface AgentesSummary {
  total: number
  activos: number
  borradores: number
}
