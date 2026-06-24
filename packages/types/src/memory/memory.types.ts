export interface ChatMessage {
  type: 'human' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  source?: 'agent' | 'operator';
  isEscalated?: boolean;
  fileUrl?: string;
  messageType?: 'text' | 'image' | 'file';
}

export interface ChatMemoryEntity {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
