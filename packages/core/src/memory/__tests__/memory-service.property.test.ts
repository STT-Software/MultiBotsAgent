import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { MemoryService } from "../memory.service";
import type { IChatMemoryRepository } from "../interfaces/repositories";
import type { ChatMemoryEntity } from "@multibotagents/types";

// Arbitrary to generate a Single ChatMessage
const messageTypeArb = fc.constantFrom("human", "ai", "system");
const messageContentArb = fc.string({ minLength: 1, maxLength: 50 });
const messageSourceArb = fc.constantFrom("agent", "operator", undefined);
const messageIsEscalatedArb = fc.boolean();

const chatMessageArb = fc.record({
  type: messageTypeArb,
  content: messageContentArb,
  timestamp: fc.date(),
  source: messageSourceArb,
  isEscalated: messageIsEscalatedArb,
});

const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
};

describe("MemoryService Property-Based Tests", () => {
  describe("Propiedad 1: Test de filtrado de historial", () => {
    it("should never return messages with source === 'operator' or isEscalated === true when includeEscalated is false", () => {
      fc.assert(
        fc.asyncProperty(fc.array(chatMessageArb), async (messages) => {
          const mockRepository: IChatMemoryRepository = {
            findBySessionId: vi.fn().mockResolvedValue({
              id: "session_id",
              sessionId: "session_123",
              messages,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as ChatMemoryEntity),
            appendMessages: vi.fn(),
            touchSession: vi.fn(),
            deleteBySessionId: vi.fn(),
          };

          const service = new MemoryService({
            chatMemoryRepository: mockRepository,
            logger: mockLogger,
            config: { defaultLimit: 1000 }, // set a large default limit to retrieve all filtered messages
          });

          const result = await service.getHistory("session_123", undefined, false);

          for (const msg of result) {
            expect(msg.source).not.toBe("operator");
            expect(msg.isEscalated).not.toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Propiedad 2: Test de truncamiento (ventana deslizante)", () => {
    it("should always restrict returned message count to <= limit", () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(chatMessageArb),
          fc.integer({ min: 1, max: 20 }),
          async (messages, limit) => {
            const mockRepository: IChatMemoryRepository = {
              findBySessionId: vi.fn().mockResolvedValue({
                id: "session_id",
                sessionId: "session_123",
                messages,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as ChatMemoryEntity),
              appendMessages: vi.fn(),
              touchSession: vi.fn(),
              deleteBySessionId: vi.fn(),
            };

            const service = new MemoryService({
              chatMemoryRepository: mockRepository,
              logger: mockLogger,
            });

            const result = await service.getHistory("session_123", limit, true);

            expect(result.length).toBeLessThanOrEqual(limit);
            if (messages.length > 0) {
              // Ensure we return the most recent messages (end of array)
              const expectedSlice = messages.slice(-limit);
              expect(result.map((m) => m.content)).toEqual(
                expectedSlice.map((m) => m.content)
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Propiedad 4: Test de inmutabilidad en refreshTTL", () => {
    it("should never alter stored messages when refreshing TTL", () => {
      fc.assert(
        fc.asyncProperty(fc.array(chatMessageArb), async (messages) => {
          const entity: ChatMemoryEntity = {
            id: "session_id",
            sessionId: "session_123",
            messages,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const mockRepository: IChatMemoryRepository = {
            findBySessionId: vi.fn().mockResolvedValue(entity),
            appendMessages: vi.fn(),
            touchSession: vi.fn(),
            deleteBySessionId: vi.fn(),
          };

          const service = new MemoryService({
            chatMemoryRepository: mockRepository,
            logger: mockLogger,
          });

          await service.refreshTTL("session_123");

          expect(mockRepository.touchSession).toHaveBeenCalledWith("session_123");
          // Check that no modification to the messages array occurred
          expect(entity.messages).toEqual(messages);
        }),
        { numRuns: 100 }
      );
    });
  });
});
