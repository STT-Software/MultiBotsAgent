import { fetchWithAuth } from "@/lib/auth";
import {
  ConversationMessage,
  ConversationStatus,
  EscalatedConversation,
  EscalatedConversationsResponse,
  SendMessageDTO,
} from "../types/inbox.types";

const API_BASE = "/api/escalamiento";

// ─── Fetch Conversations ─────────────────────────────────────────────────────

export async function fetchEscalatedConversations(): Promise<EscalatedConversationsResponse> {
  const res = await fetchWithAuth(`${API_BASE}/conversations?status=escalated`);
  if (!res.ok) {
    throw new Error("Error al cargar conversaciones escaladas");
  }
  return res.json();
}

export async function fetchConversationsByStatus(status: ConversationStatus): Promise<EscalatedConversation[]> {
  const res = await fetchWithAuth(`${API_BASE}/conversations?status=${status}`);
  if (!res.ok) {
    throw new Error(`Error al cargar conversaciones con status ${status}`);
  }
  const data = await res.json();
  return data.data;
}

export async function fetchConversationById(id: string): Promise<EscalatedConversation | null> {
  const res = await fetchWithAuth(`${API_BASE}/conversations/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error("Error al cargar la conversación");
  }
  return res.json();
}

export async function fetchPendingCount(): Promise<number> {
  const res = await fetchWithAuth(`${API_BASE}/pending-count`);
  if (!res.ok) {
    throw new Error("Error al obtener el contador de pendientes");
  }
  const data = await res.json();
  return data.count;
}

// ─── Send Message ────────────────────────────────────────────────────────────

export async function sendOperatorMessage(dto: SendMessageDTO): Promise<ConversationMessage> {
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
  if (!res.ok) {
    throw new Error("Error al subir el archivo");
  }
}

// ─── Seed ────────────────────────────────────────────────────────────────────

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
