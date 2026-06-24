import type { ChatMemoryEntity, ChatMessage } from "@multibotagents/types";

export interface IChatMemoryRepository {
  findBySessionId(sessionId: string): Promise<ChatMemoryEntity | null>;
  appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void>;
  touchSession(sessionId: string): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<void>;
}
