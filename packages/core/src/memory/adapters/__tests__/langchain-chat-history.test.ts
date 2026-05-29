import { describe, it, expect, beforeEach, vi } from "vitest";
import { MongoDBChatMessageHistory } from "../langchain-chat-history";
import { MemoryService } from "../../memory.service";
import type { ChatMessage } from "@multibotagents/types";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// Mock the MemoryService
function createMockMemoryService(): MemoryService {
  return {
    getHistory: vi.fn(),
    addMessage: vi.fn(),
    clearMemory: vi.fn(),
  } as any;
}

describe("MongoDBChatMessageHistory", () => {
  let mockMemoryService: MemoryService;
  let history: MongoDBChatMessageHistory;

  beforeEach(() => {
    mockMemoryService = createMockMemoryService();
    history = new MongoDBChatMessageHistory(mockMemoryService, "session_123", 10, false);
    vi.clearAllMocks();
  });

  describe("getMessages", () => {
    it("should fetch messages from MemoryService and map them to LangChain message classes", async () => {
      const messages: ChatMessage[] = [
        { type: "human", content: "hola", timestamp: new Date() },
        { type: "ai", content: "hola!", timestamp: new Date(), source: "agent" },
        { type: "system", content: "system message", timestamp: new Date() },
      ];

      vi.mocked(mockMemoryService.getHistory).mockResolvedValue(messages);

      const result = await history.getMessages();

      expect(mockMemoryService.getHistory).toHaveBeenCalledWith("session_123", 10, false);
      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(HumanMessage);
      expect(result[0].content).toBe("hola");
      expect(result[1]).toBeInstanceOf(AIMessage);
      expect(result[1].content).toBe("hola!");
      expect(result[2]).toBeInstanceOf(SystemMessage);
      expect(result[2].content).toBe("system message");
    });
  });

  describe("addMessage", () => {
    it("should map HumanMessage and call MemoryService.addMessage", async () => {
      const message = new HumanMessage("hola de humano");
      await history.addMessage(message);

      expect(mockMemoryService.addMessage).toHaveBeenCalledWith("session_123", {
        type: "human",
        content: "hola de humano",
        timestamp: expect.any(Date),
      });
    });

    it("should map AIMessage with source agent and call MemoryService.addMessage", async () => {
      const message = new AIMessage("hola de bot");
      await history.addMessage(message);

      expect(mockMemoryService.addMessage).toHaveBeenCalledWith("session_123", {
        type: "ai",
        content: "hola de bot",
        source: "agent",
        timestamp: expect.any(Date),
      });
    });

    it("should map SystemMessage and call MemoryService.addMessage", async () => {
      const message = new SystemMessage("system alert");
      await history.addMessage(message);

      expect(mockMemoryService.addMessage).toHaveBeenCalledWith("session_123", {
        type: "system",
        content: "system alert",
        timestamp: expect.any(Date),
      });
    });
  });

  describe("addUserMessage and addAIMessage", () => {
    it("should add a user message directly", async () => {
      await history.addUserMessage("hola directo");
      expect(mockMemoryService.addMessage).toHaveBeenCalledWith("session_123", {
        type: "human",
        content: "hola directo",
        timestamp: expect.any(Date),
      });
    });

    it("should add an AI message directly", async () => {
      await history.addAIMessage("bot directo");
      expect(mockMemoryService.addMessage).toHaveBeenCalledWith("session_123", {
        type: "ai",
        content: "bot directo",
        source: "agent",
        timestamp: expect.any(Date),
      });
    });
  });

  describe("clear", () => {
    it("should call clearMemory on MemoryService", async () => {
      await history.clear();
      expect(mockMemoryService.clearMemory).toHaveBeenCalledWith("session_123");
    });
  });
});
