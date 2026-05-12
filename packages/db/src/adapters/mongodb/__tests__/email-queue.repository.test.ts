import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { EmailQueueRepository } from "../email-queue.repository";
import { EMAIL_QUEUE_COLLECTION } from "../../../schemas/email-queue.schema";

// ─── Mock Helpers ────────────────────────────────────────────────────────────

function createMockCollection() {
  return {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  };
}

function createMockDb(collection: ReturnType<typeof createMockCollection>) {
  return {
    collection: vi.fn().mockReturnValue(collection),
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("EmailQueueRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: EmailQueueRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new EmailQueueRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(EMAIL_QUEUE_COLLECTION);
  });

  describe("enqueue", () => {
    const validItem = {
      to: "user@example.com",
      template: "verification" as const,
      payload: { token: "abc123", url: "https://app.example.com/verify?token=abc123" },
    };

    it("should set status to 'pending'", async () => {
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      await repository.enqueue(validItem);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc.status).toBe("pending");
    });

    it("should set attempts to 0", async () => {
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      await repository.enqueue(validItem);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc.attempts).toBe(0);
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const before = new Date();
      await repository.enqueue(validItem);
      const after = new Date();

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc.createdAt).toBeInstanceOf(Date);
      expect(insertedDoc.updatedAt).toBeInstanceOf(Date);
      expect(insertedDoc.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(insertedDoc.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(insertedDoc.createdAt).toEqual(insertedDoc.updatedAt);
    });

    it("should map to, template, and payload from input", async () => {
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      await repository.enqueue(validItem);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc.to).toBe(validItem.to);
      expect(insertedDoc.template).toBe(validItem.template);
      expect(insertedDoc.payload).toEqual(validItem.payload);
    });

    it("should return an EmailQueueItem entity with an id", async () => {
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const result = await repository.enqueue(validItem);

      expect(result.id).toBe(insertedId.toHexString());
      expect(result.to).toBe(validItem.to);
      expect(result.template).toBe(validItem.template);
      expect(result.status).toBe("pending");
      expect(result.attempts).toBe(0);
    });

    it("should not set nextRetryAt or lastError on initial enqueue", async () => {
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      await repository.enqueue(validItem);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc.nextRetryAt).toBeUndefined();
      expect(insertedDoc.lastError).toBeUndefined();
    });
  });
});
