export type EscalationType = "explicit" | "agent_detected";
export type ConversationStatus = "escalated" | "resolved" | "unassigned";
export type MessageSender = "user" | "agent" | "operator";
export type MessageType = "text" | "image" | "file";

export interface ConversationMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
  type: MessageType;
}

export interface EscalatedConversation {
  id: string;
  userId: string;
  userAvatar?: string;
  agentId: string;
  agentName: string;
  agentType: "rag" | "cotizador" | "agendamiento";
  status: ConversationStatus;
  escalationType: EscalationType;
  escalatedAt: string;
  reason: string;
  messages: ConversationMessage[];
}

export interface EscalatedConversationsResponse {
  data: EscalatedConversation[];
  pendingCount: number;
}
