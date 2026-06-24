import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { EmailQueueRepository } from "../email-queue.repository";
import { EMAIL_QUEUE_COLLECTION } from "../../../schemas/email-queue.schema";
import { EmailQueueStatus } from "@multibotagents/types";

// ─── Mock Helpers ────────────────────────────────────────────────────────────

function createMockCollection() {
  return {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      toArray: vi.fn().mockResolvedValue([]),
    }),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
  };
}

function createMockDb(collection: ReturnType<typeof createMockCollection>) {
  return {
    collection: vi.fn().mockReturnValue(collection),
  } as any;
}

function createMockDocument(overrides = {}) {
  return {
    _id: new ObjectId(),
    to: "user@example.com",
    template: "verification" as const,
    payload: { token: "abc123", url: "https://app.example.com/verify?token=abc123" },
    status: EmailQueueStatus.PENDING,
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
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

  describe("findEligible", () => {
    it("should query for pending or failed-with-retry documents", async () => {
      const docs = [createMockDocument()];
      const toArrayMock = vi.fn().mockResolvedValue(docs);
      const limitMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = vi.fn().mockReturnValue({ limit: limitMock });
      mockCollection.find.mockReturnValue({ sort: sortMock });

      await repository.findEligible(50);

      const filter = mockCollection.find.mock.calls[0][0];
      expect(filter.$or).toHaveLength(2);
      expect(filter.$or[0]).toEqual({ status: EmailQueueStatus.PENDING });
      expect(filter.$or[1].status).toBe(EmailQueueStatus.FAILED);
      expect(filter.$or[1].nextRetryAt).toHaveProperty("$lte");
    });

    it("should sort by createdAt ascending (FIFO)", async () => {
      const toArrayMock = vi.fn().mockResolvedValue([]);
      const limitMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = vi.fn().mockReturnValue({ limit: limitMock });
      mockCollection.find.mockReturnValue({ sort: sortMock });

      await repository.findEligible(50);

      expect(sortMock).toHaveBeenCalledWith({ createdAt: 1 });
    });

    it("should respect the limit parameter", async () => {
      const toArrayMock = vi.fn().mockResolvedValue([]);
      const limitMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = vi.fn().mockReturnValue({ limit: limitMock });
      mockCollection.find.mockReturnValue({ sort: sortMock });

      await repository.findEligible(25);

      expect(limitMock).toHaveBeenCalledWith(25);
    });

    it("should return mapped entities", async () => {
      const doc = createMockDocument();
      const toArrayMock = vi.fn().mockResolvedValue([doc]);
      const limitMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
      const sortMock = vi.fn().mockReturnValue({ limit: limitMock });
      mockCollection.find.mockReturnValue({ sort: sortMock });

      const result = await repository.findEligible(50);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(doc._id.toHexString());
      expect(result[0].to).toBe(doc.to);
    });
  });

  describe("takeForProcessing", () => {
    it("should use atomic findOneAndUpdate with status filter", async () => {
      const doc = createMockDocument({ status: EmailQueueStatus.PROCESSING });
      mockCollection.findOneAndUpdate.mockResolvedValue(doc);

      const id = doc._id.toHexString();
      await repository.takeForProcessing(id, EmailQueueStatus.PENDING);

      const [filter, update, options] = mockCollection.findOneAndUpdate.mock.calls[0];
      expect(filter._id).toEqual(new ObjectId(id));
      expect(filter.status).toBe(EmailQueueStatus.PENDING);
      expect(update.$set.status).toBe(EmailQueueStatus.PROCESSING);
      expect(options.returnDocument).toBe("after");
    });

    it("should return null when document not found or status changed", async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null);

      const result = await repository.takeForProcessing(
        new ObjectId().toHexString(),
        EmailQueueStatus.PENDING,
      );

      expect(result).toBeNull();
    });

    it("should return the updated entity when lock acquired", async () => {
      const doc = createMockDocument({ status: EmailQueueStatus.PROCESSING });
      mockCollection.findOneAndUpdate.mockResolvedValue(doc);

      const result = await repository.takeForProcessing(
        doc._id.toHexString(),
        EmailQueueStatus.PENDING,
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(doc._id.toHexString());
      expect(result!.status).toBe(EmailQueueStatus.PROCESSING);
    });
  });

  describe("markSent", () => {
    it("should update status to 'sent' with updatedAt", async () => {
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      const id = new ObjectId().toHexString();

      await repository.markSent(id);

      const [filter, update] = mockCollection.updateOne.mock.calls[0];
      expect(filter._id).toEqual(new ObjectId(id));
      expect(update.$set.status).toBe(EmailQueueStatus.SENT);
      expect(update.$set.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("markFailed", () => {
    it("should update status to 'failed' with error and retry info", async () => {
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      const id = new ObjectId().toHexString();
      const nextRetry = new Date(Date.now() + 60000);

      await repository.markFailed(id, "Connection timeout", nextRetry, 1);

      const [filter, update] = mockCollection.updateOne.mock.calls[0];
      expect(filter._id).toEqual(new ObjectId(id));
      expect(update.$set.status).toBe(EmailQueueStatus.FAILED);
      expect(update.$set.lastError).toBe("Connection timeout");
      expect(update.$set.nextRetryAt).toBe(nextRetry);
      expect(update.$set.attempts).toBe(1);
    });

    it("should set nextRetryAt to undefined when null (max retries reached)", async () => {
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      const id = new ObjectId().toHexString();

      await repository.markFailed(id, "Max retries exceeded", null, 3);

      const [, update] = mockCollection.updateOne.mock.calls[0];
      expect(update.$set.nextRetryAt).toBeUndefined();
    });
  });

  describe("countByStatus", () => {
    it("should count documents with the given status", async () => {
      mockCollection.countDocuments.mockResolvedValue(5);

      const result = await repository.countByStatus(EmailQueueStatus.PENDING);

      expect(mockCollection.countDocuments).toHaveBeenCalledWith({
        status: EmailQueueStatus.PENDING,
      });
      expect(result).toBe(5);
    });
  });

  describe("avgQueueTime", () => {
    it("should return 0 when no pending documents exist", async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });

      const result = await repository.avgQueueTime();

      expect(result).toBe(0);
    });

    it("should return the average queue time from aggregation", async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ avgMs: 5000 }]),
      });

      const result = await repository.avgQueueTime();

      expect(result).toBe(5000);
    });

    it("should use aggregation pipeline matching pending status", async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });

      await repository.avgQueueTime();

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.status).toBe(EmailQueueStatus.PENDING);
      expect(pipeline[1].$group._id).toBeNull();
      expect(pipeline[1].$group.avgMs.$avg).toBeDefined();
    });
  });

  describe("resetStuckDocuments", () => {
    it("should update processing documents older than timeout to pending", async () => {
      mockCollection.updateMany.mockResolvedValue({ modifiedCount: 2 });
      const timeoutMs = 5 * 60 * 1000; // 5 minutes

      const before = Date.now();
      await repository.resetStuckDocuments(timeoutMs);
      const after = Date.now();

      const [filter, update] = mockCollection.updateMany.mock.calls[0];
      expect(filter.status).toBe(EmailQueueStatus.PROCESSING);
      expect(filter.updatedAt.$lte).toBeInstanceOf(Date);

      // Verify cutoff is approximately now - timeoutMs
      const cutoffTime = filter.updatedAt.$lte.getTime();
      expect(cutoffTime).toBeGreaterThanOrEqual(before - timeoutMs);
      expect(cutoffTime).toBeLessThanOrEqual(after - timeoutMs);

      expect(update.$set.status).toBe(EmailQueueStatus.PENDING);
      expect(update.$set.updatedAt).toBeInstanceOf(Date);
    });
  });
});
