import type { Collection, Db } from "mongodb";
import type { ChatMemoryEntity, ChatMessage } from "@multibotagents/types";
import type { IChatMemoryRepository } from "@multibotagents/core/src/memory/interfaces/repositories";
import {
  CHAT_MEMORIES_COLLECTION,
  type ChatMemoryDocument,
} from "../../schemas/chat-memory.schema";

export class MongoDBChatMemoryRepository implements IChatMemoryRepository {
  private readonly collection: Collection<ChatMemoryDocument>;

  constructor(db: Db) {
    this.collection = db.collection<ChatMemoryDocument>(
      CHAT_MEMORIES_COLLECTION
    );
  }

  private mapDocumentToEntity(doc: ChatMemoryDocument): ChatMemoryEntity {
    return {
      id: doc._id.toHexString(),
      sessionId: doc.sessionId,
      messages: doc.messages.map((m) => ({
        type: m.type as 'human' | 'ai' | 'system',
        content: m.content,
        timestamp: m.timestamp,
        source: m.source as 'agent' | 'operator' | undefined,
        isEscalated: m.isEscalated,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findBySessionId(sessionId: string): Promise<ChatMemoryEntity | null> {
    const doc = await this.collection.findOne({ sessionId });
    return doc ? this.mapDocumentToEntity(doc) : null;
  }

  async appendMessages(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    const now = new Date();
    await this.collection.updateOne(
      { sessionId },
      {
        $push: { messages: { $each: messages } },
        $set: { updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.collection.updateOne(
      { sessionId },
      { $set: { updatedAt: new Date() } }
    );
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.collection.deleteOne({ sessionId });
  }
}
