import { fetchWithAuth } from "@/lib/auth";
import {
  ConversationMessage,
  ConversationStatus,
  EscalatedConversation,
  EscalatedConversationsResponse,
  SendMessageDTO,
} from "../types/inbox.types";

const API_BASE = "/escalamiento";

// ─── Mock Data (fallback cuando la API no está disponible) ───────────────────

const MOCK_CONVERSATIONS: EscalatedConversation[] = [
  {
    id: "esc-001",
    userId: "+57 310 456 7890",
    agentId: "agt-1",
    agentName: "Asistente Ventas",
    agentType: "rag",
    status: "escalated",
    escalationType: "explicit",
    escalatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reason: "El usuario solicitó hablar con un humano directamente.",
    messages: [
      { id: "m1", sender: "user", content: "Hola, necesito información sobre el plan empresarial", timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m2", sender: "agent", content: "¡Hola! Con gusto te ayudo. El plan empresarial incluye hasta 10 agentes, soporte prioritario y acceso a la API completa. ¿Te gustaría conocer los precios?", timestamp: new Date(Date.now() - 2.49 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m3", sender: "user", content: "Sí, pero también necesito saber si tienen descuento por volumen para más de 50 usuarios", timestamp: new Date(Date.now() - 2.4 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m4", sender: "agent", content: "Para descuentos por volumen necesitaría consultar con el equipo comercial. ¿Puedo ayudarte con algo más mientras tanto?", timestamp: new Date(Date.now() - 2.39 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m5", sender: "user", content: "No, prefiero hablar con alguien directamente. ¿Me puedes pasar con un asesor?", timestamp: new Date(Date.now() - 2.1 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m6", sender: "agent", content: "Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.", timestamp: new Date(Date.now() - 2.09 * 60 * 60 * 1000).toISOString(), type: "text" },
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
    escalatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reason: "El agente no tiene información sobre el producto solicitado.",
    messages: [
      { id: "m7", sender: "user", content: "Necesito una cotización para el servicio de instalación de paneles solares", timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m8", sender: "agent", content: "Puedo ayudarte con cotizaciones. ¿Podrías indicarme el área en metros cuadrados?", timestamp: new Date(Date.now() - 3.49 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m9", sender: "user", content: "Son 200m2 en una bodega industrial en Medellín", timestamp: new Date(Date.now() - 3.4 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m10", sender: "agent", content: "No cuento con información de precios para instalaciones industriales de paneles solares. Este producto no está en mi catálogo actual.", timestamp: new Date(Date.now() - 3.39 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m11", sender: "agent", content: "Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.", timestamp: new Date(Date.now() - 3.38 * 60 * 60 * 1000).toISOString(), type: "text" },
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
    escalatedAt: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(),
    reason: "El usuario pidió explícitamente hablar con un humano.",
    messages: [
      { id: "m12", sender: "user", content: "Quiero agendar una cita para mañana a las 3pm", timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m13", sender: "agent", content: "Revisando disponibilidad... Mañana a las 3pm no hay horarios disponibles. ¿Te sirve a las 4pm o 5pm?", timestamp: new Date(Date.now() - 0.99 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m14", sender: "user", content: "No, necesito que sea a las 3. ¿No pueden hacer una excepción?", timestamp: new Date(Date.now() - 0.8 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m15", sender: "agent", content: "Lamentablemente no puedo modificar la disponibilidad del calendario. Solo puedo ofrecerte los horarios disponibles.", timestamp: new Date(Date.now() - 0.79 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m16", sender: "user", content: "Pásame con un humano por favor, necesito resolver esto", timestamp: new Date(Date.now() - 0.6 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m17", sender: "agent", content: "Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.", timestamp: new Date(Date.now() - 0.59 * 60 * 60 * 1000).toISOString(), type: "text" },
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
    escalatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    reason: "El agente detectó un loop sin resolución tras múltiples intentos.",
    messages: [
      { id: "m18", sender: "user", content: "¿Cómo configuro la integración con Salesforce?", timestamp: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m19", sender: "agent", content: "Para integrar con Salesforce, ve a Configuración > Integraciones > Salesforce y sigue los pasos.", timestamp: new Date(Date.now() - 5.49 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m20", sender: "user", content: "Ya hice eso pero me da un error de autenticación OAuth", timestamp: new Date(Date.now() - 5.4 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m21", sender: "agent", content: "Verifica que las credenciales de la app conectada en Salesforce estén correctas y que el callback URL sea el correcto.", timestamp: new Date(Date.now() - 5.39 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m22", sender: "user", content: "Ya verifiqué todo y sigue sin funcionar. El error dice 'invalid_grant'", timestamp: new Date(Date.now() - 5.3 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m23", sender: "agent", content: "El error 'invalid_grant' puede deberse a un token expirado. Intenta revocar el acceso y volver a autorizar.", timestamp: new Date(Date.now() - 5.29 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m24", sender: "user", content: "Ya lo hice 3 veces y sigue igual", timestamp: new Date(Date.now() - 5.2 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m25", sender: "agent", content: "Entiendo que has intentado varias soluciones sin éxito. Este caso requiere revisión técnica especializada.", timestamp: new Date(Date.now() - 5.19 * 60 * 60 * 1000).toISOString(), type: "text" },
      { id: "m26", sender: "agent", content: "Te voy a comunicar con un asesor que podrá ayudarte mejor. Un momento por favor.", timestamp: new Date(Date.now() - 5.18 * 60 * 60 * 1000).toISOString(), type: "text" },
    ],
  },
];

// ─── Mock Mode Control ───────────────────────────────────────────────────────

let useMockMode = false;
let mockData: EscalatedConversation[] = [];

export function activateMockMode(): void {
  useMockMode = true;
  mockData = MOCK_CONVERSATIONS.map((c) => ({ ...c, messages: [...c.messages] }));
}

export function isMockMode(): boolean {
  return useMockMode;
}

// ─── Fetch Conversations ─────────────────────────────────────────────────────

export async function fetchEscalatedConversations(): Promise<EscalatedConversationsResponse> {
  if (useMockMode) {
    await new Promise((r) => setTimeout(r, 300));
    const escalated = mockData.filter((c) => c.status === "escalated");
    return { data: escalated, pendingCount: escalated.length };
  }

  const res = await fetchWithAuth(`${API_BASE}/conversations?status=escalated`);
  if (!res.ok) throw new Error("Error al cargar conversaciones escaladas");
  return res.json();
}

export async function fetchConversationsByStatus(status: ConversationStatus): Promise<EscalatedConversation[]> {
  if (useMockMode) {
    await new Promise((r) => setTimeout(r, 200));
    return mockData.filter((c) => c.status === status);
  }

  const res = await fetchWithAuth(`${API_BASE}/conversations?status=${status}`);
  if (!res.ok) throw new Error(`Error al cargar conversaciones con status ${status}`);
  const data = await res.json();
  return data.data;
}

export async function fetchConversationById(id: string): Promise<EscalatedConversation | null> {
  if (useMockMode) {
    await new Promise((r) => setTimeout(r, 150));
    return mockData.find((c) => c.id === id) ?? null;
  }

  const res = await fetchWithAuth(`${API_BASE}/conversations/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Error al cargar la conversación");
  return res.json();
}

export async function fetchPendingCount(): Promise<number> {
  if (useMockMode) {
    await new Promise((r) => setTimeout(r, 100));
    return mockData.filter((c) => c.status === "escalated").length;
  }

  const res = await fetchWithAuth(`${API_BASE}/pending-count`);
  if (!res.ok) throw new Error("Error al obtener el contador de pendientes");
  const data = await res.json();
  return data.count;
}

// ─── Send Message ────────────────────────────────────────────────────────────

export async function sendOperatorMessage(dto: SendMessageDTO): Promise<ConversationMessage> {
  if (useMockMode) {
    await new Promise((r) => setTimeout(r, 400));
    const conv = mockData.find((c) => c.id === dto.conversationId);
    if (!conv) throw new Error("Conversación no encontrada.");
    const message: ConversationMessage = {
      id: `msg-${Date.now()}`,
      sender: "operator",
      content: dto.content,
      timestamp: new Date().toISOString(),
      type: dto.type,
      status: "sent",
    };
    conv.messages.push(message);
    return message;
  }

  const res = await fetchWithAuth(`${API_BASE}/conversations/${dto.conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: dto.content,
      type: dto.type,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      fileMimeType: dto.fileMimeType,
    }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Error al enviar el mensaje" }));
    throw new Error(error.message || "Error al enviar el mensaje");
  }
  return res.json();
}

// ─── Resolve Conversation ────────────────────────────────────────────────────

export async function resolveConversation(conversationId: string): Promise<void> {
  if (useMockMode) {
    await new Promise((r) => setTimeout(r, 500));
    const conv = mockData.find((c) => c.id === conversationId);
    if (!conv) throw new Error("Conversación no encontrada.");
    conv.status = "resolved";
    return;
  }

  const res = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}/resolve`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Error al resolver la conversación" }));
    throw new Error(error.message || "Error al resolver la conversación");
  }
}

// ─── Upload Files ────────────────────────────────────────────────────────────

export interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

export async function getUploadUrl(
  conversationId: string,
  fileName: string,
  contentType: string,
): Promise<UploadUrlResult> {
  const res = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, contentType }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Error al generar URL de carga" }));
    throw new Error(error.message || "Error al generar URL de carga");
  }
  return res.json();
}

export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error("Error al subir el archivo");
}

// ─── Seed ────────────────────────────────────────────────────────────────────

export interface EscalationEventsSummary {
  todayCount: number;
  avgDurationMinutes: number;
}

export interface EscalationEventsResponse {
  data: Array<{
    id: string;
    conversationId: string;
    agentId: string;
    agentName: string;
    escalationType: string;
    reason: string;
    escalatedAt: string;
    resolvedAt: string;
    resolvedBy: string;
    durationMinutes: number;
    createdAt: string;
  }>;
  summary: EscalationEventsSummary;
}

export async function fetchEscalationEvents(): Promise<EscalationEventsResponse> {
  if (useMockMode) {
    return { data: [], summary: { todayCount: 0, avgDurationMinutes: 0 } };
  }

  const res = await fetchWithAuth(`${API_BASE}/events?today=true&limit=5`);
  if (!res.ok) {
    return { data: [], summary: { todayCount: 0, avgDurationMinutes: 0 } };
  }
  return res.json();
}

// ─── Seed (data) ─────────────────────────────────────────────────────────────

export async function seedConversations(): Promise<EscalatedConversation[]> {
  const res = await fetchWithAuth(`${API_BASE}/seed`, { method: "POST" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Error al crear datos de prueba" }));
    throw new Error(error.message || "Error al crear datos de prueba");
  }
  const data = await res.json();
  return data.data;
}

// ─── Simulated Replies (para demos) ──────────────────────────────────────────

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
