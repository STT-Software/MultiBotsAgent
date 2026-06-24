import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryService } from "../memory.service";
import type { IChatMemoryRepository } from "../interfaces/repositories";
import type { ChatMessage, ChatMemoryEntity } from "@multibotagents/types";

function createMockRepository(): IChatMemoryRepository {
  return {
    findBySessionId: vi.fn(),
    appendMessages: vi.fn(),
    touchSession: vi.fn(),
    deleteBySessionId: vi.fn(),
  };
}

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe("MemoryService", () => {
  let repository: IChatMemoryRepository;
  let service: MemoryService;

  beforeEach(() => {
    repository = createMockRepository();
    service = new MemoryService({
      chatMemoryRepository: repository,
      logger: mockLogger,
      config: { defaultLimit: 5 },
    });
    vi.clearAllMocks();
  });

  describe("getHistory", () => {
    it("should return empty array if no session found", async () => {
      vi.mocked(repository.findBySessionId).mockResolvedValue(null);
      const history = await service.getHistory("session_123");
      expect(history).toEqual([]);
      expect(repository.findBySessionId).toHaveBeenCalledWith("session_123");
    });

    it("should return filtered messages (omitting operator source and escalated)", async () => {
      const messages: ChatMessage[] = [
        { type: "human", content: "hola", timestamp: new Date() },
        { type: "ai", content: "hola!", timestamp: new Date(), source: "agent" },
        { type: "human", content: "ayuda humana", timestamp: new Date() },
        { type: "human", content: "operador aqui", timestamp: new Date(), source: "operator" },
        { type: "ai", content: "respuesta de operador", timestamp: new Date(), source: "operator", isEscalated: true },
        { type: "human", content: "gracias", timestamp: new Date(), isEscalated: true },
        { type: "human", content: "de vuelta al bot", timestamp: new Date() },
      ];

      const entity: ChatMemoryEntity = {
        id: "id_123",
        sessionId: "session_123",
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(repository.findBySessionId).mockResolvedValue(entity);

      const history = await service.getHistory("session_123");
      // Excluded:
      // - operator aqui (source: operator)
      // - respuesta de operador (source: operator, isEscalated: true)
      // - gracias (isEscalated: true)
      expect(history).toEqual([
        { type: "human", content: "hola", timestamp: expect.any(Date) },
        { type: "ai", content: "hola!", timestamp: expect.any(Date), source: "agent" },
        { type: "human", content: "ayuda humana", timestamp: expect.any(Date) },
        { type: "human", content: "de vuelta al bot", timestamp: expect.any(Date) },
      ]);
    });

    it("should include escalated messages if includeEscalated is true", async () => {
      const messages: ChatMessage[] = [
        { type: "human", content: "hola", timestamp: new Date() },
        { type: "ai", content: "hola!", timestamp: new Date(), source: "agent" },
        { type: "human", content: "ayuda humana", timestamp: new Date() },
        { type: "human", content: "operador aqui", timestamp: new Date(), source: "operator" },
        { type: "ai", content: "respuesta de operador", timestamp: new Date(), source: "operator", isEscalated: true },
        { type: "human", content: "gracias", timestamp: new Date(), isEscalated: true },
      ];

      const entity: ChatMemoryEntity = {
        id: "id_123",
        sessionId: "session_123",
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(repository.findBySessionId).mockResolvedValue(entity);

      const history = await service.getHistory("session_123", undefined, true);
      // It should include everything, but limited to defaultLimit (5)
      expect(history).toHaveLength(5);
      expect(history).toEqual([
        { type: "ai", content: "hola!", timestamp: expect.any(Date), source: "agent" },
        { type: "human", content: "ayuda humana", timestamp: expect.any(Date) },
        { type: "human", content: "operador aqui", timestamp: expect.any(Date), source: "operator" },
        { type: "ai", content: "respuesta de operador", timestamp: expect.any(Date), source: "operator", isEscalated: true },
        { type: "human", content: "gracias", timestamp: expect.any(Date), isEscalated: true },
      ]);
    });

    it("should apply limit parameter if provided", async () => {
      const messages: ChatMessage[] = [
        { type: "human", content: "msg1", timestamp: new Date() },
        { type: "human", content: "msg2", timestamp: new Date() },
        { type: "human", content: "msg3", timestamp: new Date() },
      ];

      const entity: ChatMemoryEntity = {
        id: "id_123",
        sessionId: "session_123",
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(repository.findBySessionId).mockResolvedValue(entity);

      const history = await service.getHistory("session_123", 2);
      expect(history).toEqual([
        { type: "human", content: "msg2", timestamp: expect.any(Date) },
        { type: "human", content: "msg3", timestamp: expect.any(Date) },
      ]);
    });
  });

  describe("saveContext", () => {
    it("should append human and ai messages in a single call", async () => {
      await service.saveContext("session_123", "hola", "mundo");

      expect(repository.appendMessages).toHaveBeenCalledWith(
        "session_123",
        [
          { type: "human", content: "hola", timestamp: expect.any(Date) },
          { type: "ai", content: "mundo", timestamp: expect.any(Date), source: "agent" },
        ]
      );
    });
  });

  describe("addMessage", () => {
    it("should append a single message", async () => {
      const msg: ChatMessage = { type: "human", content: "hola", timestamp: new Date() };
      await service.addMessage("session_123", msg);

      expect(repository.appendMessages).toHaveBeenCalledWith("session_123", [msg]);
    });
  });

  describe("refreshTTL", () => {
    it("should touch session if session exists", async () => {
      const entity: ChatMemoryEntity = {
        id: "id_123",
        sessionId: "session_123",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(repository.findBySessionId).mockResolvedValue(entity);

      await service.refreshTTL("session_123");

      expect(repository.touchSession).toHaveBeenCalledWith("session_123");
    });

    it("should not touch session if session does not exist", async () => {
      vi.mocked(repository.findBySessionId).mockResolvedValue(null);

      await service.refreshTTL("session_123");

      expect(repository.touchSession).not.toHaveBeenCalled();
    });
  });

  describe("clearMemory", () => {
    it("should call deleteBySessionId", async () => {
      await service.clearMemory("session_123");

      expect(repository.deleteBySessionId).toHaveBeenCalledWith("session_123");
    });
  });
});
