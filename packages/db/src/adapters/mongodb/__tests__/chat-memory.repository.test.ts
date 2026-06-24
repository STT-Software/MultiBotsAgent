import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { MongoDBChatMemoryRepository } from "../chat-memory.repository";
import { CHAT_MEMORIES_COLLECTION } from "../../../schemas/chat-memory.schema";
import type { ChatMessage } from "@multibotagents/types";

function createMockCollection() {
  return {
    findOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
  };
}

function createMockDb(collection: ReturnType<typeof createMockCollection>) {
  return {
    collection: vi.fn().mockReturnValue(collection),
  } as any;
}

describe("MongoDBChatMemoryRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: MongoDBChatMemoryRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new MongoDBChatMemoryRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(CHAT_MEMORIES_COLLECTION);
  });

  describe("findBySessionId", () => {
    it("should return null if session is not found", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const result = await repository.findBySessionId("session_123");
      expect(mockCollection.findOne).toHaveBeenCalledWith({ sessionId: "session_123" });
      expect(result).toBeNull();
    });

    it("should return mapped ChatMemoryEntity if document exists", async () => {
      const docId = new ObjectId();
      const createdAt = new Date();
      const updatedAt = new Date();
      const mockDoc = {
        _id: docId,
        sessionId: "session_123",
        messages: [
          {
            type: "human",
            content: "Hola",
            timestamp: createdAt,
          },
        ],
        createdAt,
        updatedAt,
      };
      mockCollection.findOne.mockResolvedValue(mockDoc);

      const result = await repository.findBySessionId("session_123");
      expect(result).toEqual({
        id: docId.toHexString(),
        sessionId: "session_123",
        messages: [
          {
            type: "human",
            content: "Hola",
            timestamp: createdAt,
            source: undefined,
            isEscalated: undefined,
          },
        ],
        createdAt,
        updatedAt,
      });
    });
  });

  describe("appendMessages", () => {
    it("should append messages using updateOne with upsert", async () => {
      const messages: ChatMessage[] = [
        { type: "human", content: "Hola", timestamp: new Date() },
      ];
      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.appendMessages("session_123", messages);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { sessionId: "session_123" },
        {
          $push: { messages: { $each: messages } },
          $set: { updatedAt: expect.any(Date) },
          $setOnInsert: { createdAt: expect.any(Date) },
        },
        { upsert: true }
      );
    });
  });

  describe("touchSession", () => {
    it("should update updatedAt field only", async () => {
      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.touchSession("session_123");

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { sessionId: "session_123" },
        { $set: { updatedAt: expect.any(Date) } }
      );
    });
  });

  describe("deleteBySessionId", () => {
    it("should delete document by sessionId", async () => {
      mockCollection.deleteOne.mockResolvedValue({} as any);

      await repository.deleteBySessionId("session_123");

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ sessionId: "session_123" });
    });
  });
});
