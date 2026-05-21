import { Agente } from '../types/dashboard.types'

// TODO: Reemplazar mock por fetch real a GET /api/agentes cuando el endpoint exista (slice 03)
const MOCK_AGENTES: Agente[] = [
  {
    id: '1',
    empresaId: 'emp-001',
    nombre: 'Asistente de Ventas',
    tipo: 'rag',
    estado: 'activo',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-03-01T14:30:00Z',
  },
  {
    id: '2',
    empresaId: 'emp-001',
    nombre: 'Cotizador Automático',
    tipo: 'cotizador',
    estado: 'activo',
    createdAt: '2025-02-10T08:00:00Z',
    updatedAt: '2025-03-05T09:15:00Z',
  },
  {
    id: '3',
    empresaId: 'emp-001',
    nombre: 'Bot de Agendamiento',
    tipo: 'agendamiento',
    estado: 'borrador',
    createdAt: '2025-03-20T16:00:00Z',
    updatedAt: '2025-03-20T16:00:00Z',
  },
  {
    id: '4',
    empresaId: 'emp-001',
    nombre: 'Soporte Técnico',
    tipo: 'rag',
    estado: 'activo',
    createdAt: '2025-01-20T11:00:00Z',
    updatedAt: '2025-02-28T10:00:00Z',
  },
  {
    id: '5',
    empresaId: 'emp-001',
    nombre: 'Agente de Prueba',
    tipo: 'rag',
    estado: 'borrador',
    createdAt: '2025-03-25T12:00:00Z',
    updatedAt: '2025-03-25T12:00:00Z',
  },
]

export async function fetchAgentes(): Promise<Agente[]> {
  // Simula delay de red para probar estado de loading
  await new Promise((resolve) => setTimeout(resolve, 500))
  return MOCK_AGENTES
}
