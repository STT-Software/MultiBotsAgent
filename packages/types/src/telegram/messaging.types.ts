import { ResponseMessage } from "../interfaces/rag-engine-io.interfaces";

/**
 * Evento encolado en SQS al recibir un mensaje desde Telegram.
 */
export interface TelegramIncomingMessageEvent {
  agentId: string;
  companyId: string;
  channelId: string;
  conversationId: string;
  senderUsername: string;
  messageId: string;
  messageText: string;
  timestamp: string; // ISO 8601
  messageType?: "text" | "audio" | "image";
  mediaId?: string;
  mimeType?: string;
  fileUrl?: string;
}

/**
 * Evento encolado en SQS para enviar respuestas hacia Telegram.
 */
export interface TelegramOutgoingMessageEvent {
  channelId: string;
  conversationId: string;
  messages: ResponseMessage[];
  escalated: boolean;
  escalationReason?: string;
}
