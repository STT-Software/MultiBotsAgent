import {
  ConversationMessage,
  ConversationStatus,
  EscalatedConversation,
  EscalatedConversationsResponse,
  SendMessageDTO,
} from "../types/inbox.types";

const MOCK_CONVERSATIONS: EscalatedConversation[] = [
  {
    id: "esc-001",
    userId: "+57 310 456 7890",
    agentId: "agt-1",
    agentName: "Asistente Ventas",
    agentType: "rag",
    status: "escalated",
    escalationType: "explicit",
    escalatedAt: "2026-05-22T08:15:00Z",
    reason: "El usuario solicitó hablar con un humano directamente.",
    messages: [
      { id: "m1", sender: "user", content: "Hola, necesito información sobre el plan empresarial", timestamp: "2026-05-22T08:00:00Z", type: "text" },
      { id: "m2", sender: "agent", content: "¡Hola! Con gusto te ayudo. El plan empresarial incluye hasta 10 agentes, soporte prioritario y acceso a la API completa. ¿Te gustaría conocer los precios?", timestamp: "2026-05-22T08:00:30Z", type: "text" },
      { id: "m3", sender: "user", content: "Sí, pero también necesito saber si tienen descuento por volumen para más de 50 usuarios", timestamp: "2026-05-22T08:02:00Z", type: "text" },
      { id: "m4", sender: "agent", content: "Para descuentos por volumen necesitaría consultar con el equipo comercial. ¿Puedo ayudarte con algo más mientras tanto?", timestamp: "2026-05-22T08:02:30Z", type: "text" },
      { id: "m5", sender: "user", content: "No, prefiero hablar con alguien directamente. ¿Me puedes pasar con un asesor?", timestamp: "2026-05-22T08:10:00Z", type: "text" },
      { id: "m6", sender: "agent", content: "Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.", timestamp: "2026-05-22T08:10:15Z", type: "text" },
    ],
  },
  {
    id: "esc-002",
    userId: "María García",
    agentId: "agt-2",
    agentName: "Cotizador Express",
    agentType: "cotizador",
    status: "escalated",
    escalationType: "agent_detected",
    escalatedAt: "2026-05-22T07:45:00Z",
    reason: "El agente no tiene información sobre el producto solicitado.",
    messages: [
      { id: "m7", sender: "user", content: "Necesito una cotización para el servicio de instalación de paneles solares", timestamp: "2026-05-22T07:30:00Z", type: "text" },
      { id: "m8", sender: "agent", content: "Puedo ayudarte con cotizaciones. ¿Podrías indicarme el área en metros cuadrados?", timestamp: "2026-05-22T07:30:20Z", type: "text" },
      { id: "m9", sender: "user", content: "Son 200m2 en una bodega industrial en Medellín", timestamp: "2026-05-22T07:32:00Z", type: "text" },
      { id: "m10", sender: "agent", content: "No cuento con información de precios para instalaciones industriales de paneles solares. Este producto no está en mi catálogo actual.", timestamp: "2026-05-22T07:32:30Z", type: "text" },
      { id: "m11", sender: "agent", content: "Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.", timestamp: "2026-05-22T07:33:00Z", type: "text" },
    ],
  },
  {
    id: "esc-003",
    userId: "+57 315 789 0123",
    agentId: "agt-3",
    agentName: "Agenda Citas",
    agentType: "agendamiento",
    status: "escalated",
    escalationType: "explicit",
    escalatedAt: "2026-05-22T09:30:00Z",
    reason: "El usuario pidió explícitamente hablar con un humano.",
    messages: [
      { id: "m12", sender: "user", content: "Quiero agendar una cita para mañana a las 3pm", timestamp: "2026-05-22T09:15:00Z", type: "text" },
      { id: "m13", sender: "agent", content: "Revisando disponibilidad... Mañana a las 3pm no hay horarios disponibles. ¿Te sirve a las 4pm o 5pm?", timestamp: "2026-05-22T09:15:20Z", type: "text" },
      { id: "m14", sender: "user", content: "No, necesito que sea a las 3. ¿No pueden hacer una excepción?", timestamp: "2026-05-22T09:20:00Z", type: "text" },
      { id: "m15", sender: "agent", content: "Lamentablemente no puedo modificar la disponibilidad del calendario. Solo puedo ofrecerte los horarios disponibles.", timestamp: "2026-05-22T09:20:30Z", type: "text" },
      { id: "m16", sender: "user", content: "Pásame con un humano por favor, necesito resolver esto", timestamp: "2026-05-22T09:25:00Z", type: "text" },
      { id: "m17", sender: "agent", content: "Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.", timestamp: "2026-05-22T09:25:15Z", type: "text" },
    ],
  },
  {
    id: "esc-004",
    userId: "Carlos Rodríguez",
    agentId: "agt-1",
    agentName: "Asistente Ventas",
    agentType: "rag",
    status: "escalated",
    escalationType: "agent_detected",
    escalatedAt: "2026-05-22T06:00:00Z",
    reason: "El agente detectó un loop sin resolución tras múltiples intentos.",
    messages: [
      { id: "m18", sender: "user", content: "¿Cómo configuro la integración con Salesforce?", timestamp: "2026-05-22T05:30:00Z", type: "text" },
      { id: "m19", sender: "agent", content: "Para integrar con Salesforce, ve a Configuración > Integraciones > Salesforce y sigue los pasos.", timestamp: "2026-05-22T05:30:20Z", type: "text" },
      { id: "m20", sender: "user", content: "Ya hice eso pero me da un error de autenticación OAuth", timestamp: "2026-05-22T05:32:00Z", type: "text" },
      { id: "m21", sender: "agent", content: "Verifica que las credenciales de la app conectada en Salesforce estén correctas y que el callback URL sea el correcto.", timestamp: "2026-05-22T05:32:30Z", type: "text" },
      { id: "m22", sender: "user", content: "Ya verifiqué todo y sigue sin funcionar. El error dice 'invalid_grant'", timestamp: "2026-05-22T05:35:00Z", type: "text" },
      { id: "m23", sender: "agent", content: "El error 'invalid_grant' puede deberse a un token expirado. Intenta revocar el acceso y volver a autorizar.", timestamp: "2026-05-22T05:35:30Z", type: "text" },
      { id: "m24", sender: "user", content: "Ya lo hice 3 veces y sigue igual", timestamp: "2026-05-22T05:40:00Z", type: "text" },
      { id: "m25", sender: "agent", content: "Entiendo que has intentado varias soluciones sin éxito. Este caso requiere revisión técnica especializada.", timestamp: "2026-05-22T05:40:30Z", type: "text" },
      { id: "m26", sender: "agent", content: "Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.", timestamp: "2026-05-22T05:41:00Z", type: "text" },
    ],
  },
];

// TODO: Reemplazar mock por fetch real a GET /api/inbox/conversations?status=escalated
export async function fetchEscalatedConversations(): Promise<EscalatedConversationsResponse> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const escalated = MOCK_CONVERSATIONS.filter((c) => c.status === "escalated");
  return {
    data: escalated,
    pendingCount: escalated.length,
  };
}

// TODO: Reemplazar mock por fetch real a GET /api/inbox/conversations/:id
export async function fetchConversationById(id: string): Promise<EscalatedConversation | null> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const conversation = MOCK_CONVERSATIONS.find((c) => c.id === id);
  return conversation ?? null;
}

// TODO: Reemplazar mock por fetch real a GET /api/inbox/pending-count (o WebSocket)
export async function fetchPendingCount(): Promise<number> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return MOCK_CONVERSATIONS.filter((c) => c.status === "escalated").length;
}

// Flag para activar/desactivar simulación de respuesta del usuario
export const SIMULATE_USER_REPLIES = true;

const SIMULATED_REPLIES: string[] = [
  "Gracias por la información",
  "Ok, entendido",
  "Perfecto, eso era lo que necesitaba",
  "¿Algo más que deba saber?",
  "Muchas gracias por la ayuda",
  "Excelente, quedo atento entonces",
];

export function getRandomSimulatedReply(): string {
  return SIMULATED_REPLIES[Math.floor(Math.random() * SIMULATED_REPLIES.length)];
}

// TODO: Reemplazar mock por POST /api/inbox/conversations/:id/messages
export async function sendOperatorMessage(dto: SendMessageDTO): Promise<ConversationMessage> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const conversation = MOCK_CONVERSATIONS.find((c) => c.id === dto.conversationId);
  if (!conversation) {
    throw new Error("Conversación no encontrada.");
  }

  const message: ConversationMessage = {
    id: `msg-${Date.now()}`,
    sender: "operator",
    content: dto.content,
    timestamp: new Date().toISOString(),
    type: dto.type,
  };

  conversation.messages.push(message);
  return message;
}

// TODO: Reemplazar mock por PATCH /api/inbox/conversations/:id { status: "resolved" }
export async function resolveConversation(conversationId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const conversation = MOCK_CONVERSATIONS.find((c) => c.id === conversationId);
  if (!conversation) {
    throw new Error("Conversación no encontrada.");
  }

  conversation.status = "resolved";
}

// TODO: Reemplazar mock por GET /api/inbox/conversations?status={status}
export async function fetchConversationsByStatus(status: ConversationStatus): Promise<EscalatedConversation[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return MOCK_CONVERSATIONS.filter((c) => c.status === status);
}
