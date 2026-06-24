import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { MessageLogRepository } from "../message-log.repository";
import { MESSAGE_LOGS_COLLECTION } from "../../../schemas/message-log.schema";

function createMockCollection() {
  return {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  };
}

function createMockDb(collection: ReturnType<typeof createMockCollection>) {
  return {
    collection: vi.fn().mockReturnValue(collection),
  } as any;
}

describe("MessageLogRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: MessageLogRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new MessageLogRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(MESSAGE_LOGS_COLLECTION);
  });

  describe("create", () => {
    it("should insert a message log and return it with mapped id", async () => {
      const channelId = new ObjectId().toHexString();
      const insertResult = { insertedId: new ObjectId() };
      mockCollection.insertOne.mockResolvedValue(insertResult);

      const timestamp = new Date();
      const statusUpdatedAt = new Date();
      const result = await repository.create({
        channelId,
        conversationId: "conv_123",
        direction: "incoming",
        waMessageId: "wamid.123",
        content: "Hola",
        status: "received",
        timestamp,
        statusUpdatedAt,
      });

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        channelId: new ObjectId(channelId),
        conversationId: "conv_123",
        direction: "incoming",
        waMessageId: "wamid.123",
        content: "Hola",
        status: "received",
        timestamp,
        statusUpdatedAt,
      });
      expect(result).toEqual({
        id: insertResult.insertedId.toHexString(),
        channelId,
        conversationId: "conv_123",
        direction: "incoming",
        waMessageId: "wamid.123",
        content: "Hola",
        status: "received",
        timestamp,
        statusUpdatedAt,
      });
    });
  });

  describe("findAll", () => {
    it("should find and map logs matching the filter", async () => {
      const channelId = new ObjectId();
      const log1Id = new ObjectId();
      const log2Id = new ObjectId();
      const date1 = new Date("2026-01-01T00:00:00Z");
      const date2 = new Date("2026-01-01T00:01:00Z");

      const mockCursor = {
        toArray: vi.fn().mockResolvedValue([
          {
            _id: log1Id,
            channelId,
            conversationId: "conv_123",
            direction: "incoming",
            waMessageId: "wamid.1",
            content: "Hola",
            status: "received",
            timestamp: date1,
            statusUpdatedAt: date1,
          },
          {
            _id: log2Id,
            channelId,
            conversationId: "conv_123",
            direction: "outgoing",
            waMessageId: "wamid.2",
            content: "Hola usuario",
            status: "sent",
            timestamp: date2,
            statusUpdatedAt: date2,
          },
        ]),
      };

      mockCollection.find.mockReturnValue(mockCursor as any);

      const results = await repository.findAll({ conversationId: "conv_123" });

      expect(mockCollection.find).toHaveBeenCalledWith({ conversationId: "conv_123" });
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: log1Id.toHexString(),
        channelId: channelId.toHexString(),
        conversationId: "conv_123",
        direction: "incoming",
        waMessageId: "wamid.1",
        content: "Hola",
        status: "received",
        timestamp: date1,
        statusUpdatedAt: date1,
      });
      expect(results[1]).toEqual({
        id: log2Id.toHexString(),
        channelId: channelId.toHexString(),
        conversationId: "conv_123",
        direction: "outgoing",
        waMessageId: "wamid.2",
        content: "Hola usuario",
        status: "sent",
        timestamp: date2,
        statusUpdatedAt: date2,
      });
    });
  });
});
