import { fetchWithAuth } from "@/lib/auth"
import { Agente } from '../types/dashboard.types'

export async function fetchAgentes(): Promise<Agente[]> {
  const res = await fetchWithAuth("/agents")
  if (!res.ok) {
    throw new Error(`Error al obtener agentes: ${res.status}`)
  }
  const data = await res.json()
  
  return data.map((item: any) => ({
    id: item.id || item._id,
    empresaId: item.companyId || '',
    nombre: item.nombre || '',
    tipo: item.tipo,
    estado: item.estado,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }))
}
