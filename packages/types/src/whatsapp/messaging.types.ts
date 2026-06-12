import { ResponseMessage } from "../interfaces/rag-engine-io.interfaces";

/**
 * Evento encolado en SQS al recibir un mensaje desde Meta.
 */
export interface IncomingMessageEvent {
  agentId: string;
  companyId: string;
  channelId: string;
  conversationId: string;
  senderPhoneNumber: string;
  phoneNumberId: string; // ID del número de Meta
  messageId: string; // wamid de Meta
  messageText: string;
  timestamp: string; // ISO 8601
  messageType?: "text" | "audio" | "image";
  mediaId?: string;
  mimeType?: string;
  fileUrl?: string;
}

/**
 * Evento encolado en SQS para enviar respuestas hacia Meta.
 */
export interface OutgoingMessageEvent {
  channelId: string;
  phoneNumberId: string;
  recipientPhone: string;
  conversationId: string;
  messages: ResponseMessage[];
  escalated: boolean;
  escalationReason?: string;
}

/**
 * Representa una interacción registrada para evitar duplicidad de webhooks (idempotencia).
 */
export interface ProcessedMessage {
  waMessageId: string; // wamid único de Meta
  receivedAt: Date;
  expiresAt: Date; // TTL 24h
}

/**
 * Registro de auditoría del estado de envío de un mensaje.
 */
export interface MessageLog {
  id: string; // ID interno del log en MongoDB
  channelId: string;
  conversationId: string;
  direction: "incoming" | "outgoing";
  waMessageId: string; // ID de Meta (wamid)
  content: string;
  status: "sent" | "delivered" | "read" | "failed";
  errorCode?: number;
  errorMessage?: string;
  timestamp: Date;
  statusUpdatedAt?: Date;
}
