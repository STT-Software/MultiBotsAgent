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

export function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / (60 * 1000))
  const diffHour = Math.floor(diffMs / (60 * 60 * 1000))
  const diffDay = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffMin < 1) return 'Hace unos segundos'
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHour < 24) return `Hace ${diffHour} hora${diffHour > 1 ? 's' : ''}`
  return `Hace ${diffDay} día${diffDay > 1 ? 's' : ''}`
}

function buildEventMessage(eventType: string, metadata: any): string {
  switch (eventType) {
    case 'conversation.completed':
      return `Conversación finalizada con éxito. ${metadata?.customerPhone ? 'Cliente: ' + metadata.customerPhone : ''}`
    case 'conversation.escalated':
      return `Conversación escalada a operador humano. ${metadata?.reason ? 'Motivo: ' + metadata.reason : ''}`
    case 'rag.no_answer':
      return 'Consulta del cliente no pudo ser respondida por el agente de soporte.'
    case 'rag.topic_identified':
      return `Tema de consulta detectado: "${metadata?.topic || 'Desconocido'}"`
    case 'order.initiated':
      return `Cotización iniciada. ${metadata?.total ? 'Monto: $' + metadata.total + ' ARS' : ''}`
    case 'order.confirmed':
      return `Cotización confirmada y guardada. ${metadata?.total ? 'Monto: $' + metadata.total + ' ARS' : ''}`
    case 'order.abandoned':
      return 'Cotización abandonada por el cliente.'
    case 'appointment.scheduled':
      return `Cita agendada para el ${metadata?.dateTime ? new Date(metadata.dateTime).toLocaleDateString('es-ES') : 'cliente'}`
    case 'appointment.cancelled':
      return 'Cita cancelada por el cliente.'
    case 'appointment.rescheduled':
      return 'Cita reprogramada por el cliente.'
    case 'escalation.opened':
      return 'Solicitud de escalamiento iniciada.'
    case 'escalation.resolved':
      return 'Escalamiento resuelto por el operador.'
    case 'escalation.timeout':
      return 'Escalamiento expirado por falta de respuesta.'
    default:
      return 'Evento de sistema procesado.'
  }
}

function getEventTypeGroup(eventType: string): 'chat' | 'order' | 'escalate' | 'system' {
  if (eventType.startsWith('order.')) return 'order'
  if (eventType.startsWith('escalation.') || eventType === 'conversation.escalated') return 'escalate'
  if (eventType.startsWith('conversation.') || eventType.startsWith('rag.') || eventType.startsWith('appointment.')) return 'chat'
  return 'system'
}

export async function fetchRecentActivity(agentes: Agente[]): Promise<any[]> {
  const res = await fetchWithAuth('/metricas/recientes?limit=5')
  if (!res.ok) {
    throw new Error(`Error al obtener actividad reciente: ${res.status}`)
  }
  const data = await res.json()

  return data.map((item: any) => {
    const agenteObj = agentes.find((a) => a.id === item.agentId)
    let agentName = agenteObj ? agenteObj.nombre : ''
    if (!agentName) {
      if (item.agentType === 'rag') agentName = 'WhatsApp RAG Agent'
      else if (item.agentType === 'cotizador') agentName = 'Quote Agent'
      else if (item.agentType === 'agendamiento') agentName = 'Booking Agent'
      else agentName = 'Sistema'
    }

    return {
      id: item.id || item._id,
      time: formatRelativeTime(item.timestamp),
      type: getEventTypeGroup(item.eventType),
      message: buildEventMessage(item.eventType, item.metadata),
      agent: agentName,
    }
  })
}

