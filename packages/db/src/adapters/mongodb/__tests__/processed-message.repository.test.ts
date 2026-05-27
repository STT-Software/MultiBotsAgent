import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { ProcessedMessageRepository } from "../processed-message.repository";
import { PROCESSED_MESSAGES_COLLECTION } from "../../../schemas/processed-message.schema";

function createMockCollection() {
  return {
    insertOne: vi.fn(),
    findOne: vi.fn(),
  };
}

function createMockDb(collection: ReturnType<typeof createMockCollection>) {
  return {
    collection: vi.fn().mockReturnValue(collection),
  } as any;
}

describe("ProcessedMessageRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: ProcessedMessageRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new ProcessedMessageRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(PROCESSED_MESSAGES_COLLECTION);
  });

  describe("findByWaMessageId", () => {
    it("should return null if message not found", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.findByWaMessageId("wamid.123");

      expect(mockCollection.findOne).toHaveBeenCalledWith({ waMessageId: "wamid.123" });
      expect(result).toBeNull();
    });

    it("should return the processed message if found", async () => {
      const id = new ObjectId();
      const receivedAt = new Date();
      const expiresAt = new Date();
      mockCollection.findOne.mockResolvedValue({
        _id: id,
        waMessageId: "wamid.123",
        receivedAt,
        expiresAt,
      });

      const result = await repository.findByWaMessageId("wamid.123");

      expect(result).toEqual({
        waMessageId: "wamid.123",
        receivedAt,
        expiresAt,
      });
    });
  });

  describe("create", () => {
    it("should insert a processed message and return it", async () => {
      const receivedAt = new Date();
      const expiresAt = new Date();
      const insertResult = { insertedId: new ObjectId() };
      mockCollection.insertOne.mockResolvedValue(insertResult);

      const result = await repository.create({
        waMessageId: "wamid.abc",
        receivedAt,
        expiresAt,
      });

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        waMessageId: "wamid.abc",
        receivedAt,
        expiresAt,
      });
      expect(result).toEqual({
        waMessageId: "wamid.abc",
        receivedAt,
        expiresAt,
      });
    });
  });
});
