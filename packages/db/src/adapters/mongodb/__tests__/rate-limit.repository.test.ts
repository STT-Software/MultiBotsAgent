import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { RateLimitRepository } from "../rate-limit.repository";
import { RATE_LIMITS_COLLECTION } from "../../../schemas/rate-limit.schema";

// ─── Mock Helpers ────────────────────────────────────────────────────────────

function createMockCollection() {
  return {
    findOne: vi.fn(),
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

describe("RateLimitRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: RateLimitRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new RateLimitRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(RATE_LIMITS_COLLECTION);
  });

  describe("findByKey", () => {
    it("should return null when no record exists", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.findByKey("ip:192.168.1.1");

      expect(result).toBeNull();
      expect(mockCollection.findOne).toHaveBeenCalledWith({ key: "ip:192.168.1.1" });
    });

    it("should return the entity when record exists", async () => {
      const now = new Date();
      const doc = {
        _id: new ObjectId(),
        key: "email:user@example.com",
        attempts: 3,
        blockedUntil: null,
        expiresAt: new Date(now.getTime() + 60_000),
        createdAt: now,
      };
      mockCollection.findOne.mockResolvedValue(doc);

      const result = await repository.findByKey("email:user@example.com");

      expect(result).not.toBeNull();
      expect(result!.key).toBe("email:user@example.com");
      expect(result!.attempts).toBe(3);
      expect(result!.blockedUntil).toBeNull();
      expect(result!.id).toBe(doc._id.toHexString());
    });
  });

  describe("upsertAttempt", () => {
    it("should increment attempts counter on upsert", async () => {
      const now = new Date();
      const resultDoc = {
        _id: new ObjectId(),
        key: "ip:10.0.0.1",
        attempts: 1,
        blockedUntil: null,
        expiresAt: new Date(now.getTime() + 60_000),
        createdAt: now,
      };
      mockCollection.findOneAndUpdate.mockResolvedValue(resultDoc);

      const result = await repository.upsertAttempt(
        "ip:10.0.0.1",
        60_000,
        300_000,
        5,
      );

      expect(result.attempts).toBe(1);
      expect(result.key).toBe("ip:10.0.0.1");

      // Verify the $inc operator is used
      const updateCall = mockCollection.findOneAndUpdate.mock.calls[0];
      expect(updateCall[1].$inc).toEqual({ attempts: 1 });
    });

    it("should set blockedUntil when attempts reach maxAttempts", async () => {
      const now = new Date();
      const resultDoc = {
        _id: new ObjectId(),
        key: "ip:10.0.0.1",
        attempts: 5,
        blockedUntil: null,
        expiresAt: new Date(now.getTime() + 60_000),
        createdAt: now,
      };
      // First call returns the upserted doc at threshold
      mockCollection.findOneAndUpdate.mockResolvedValueOnce(resultDoc);
      // Second call sets blockedUntil
      const blockedDoc = {
        ...resultDoc,
        blockedUntil: new Date(now.getTime() + 300_000),
      };
      mockCollection.findOneAndUpdate.mockResolvedValueOnce(blockedDoc);

      const result = await repository.upsertAttempt(
        "ip:10.0.0.1",
        60_000,
        300_000,
        5,
      );

      expect(result.blockedUntil).not.toBeNull();
      // Second findOneAndUpdate should set blockedUntil
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });

    it("should use upsert: true to create record if not exists", async () => {
      const resultDoc = {
        _id: new ObjectId(),
        key: "email:new@test.com",
        attempts: 1,
        blockedUntil: null,
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      mockCollection.findOneAndUpdate.mockResolvedValue(resultDoc);

      await repository.upsertAttempt("email:new@test.com", 600_000, 900_000, 10);

      const callArgs = mockCollection.findOneAndUpdate.mock.calls[0];
      expect(callArgs[2].upsert).toBe(true);
      expect(callArgs[2].returnDocument).toBe("after");
    });

    it("should throw error when findOneAndUpdate returns null", async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        repository.upsertAttempt("ip:bad", 60_000, 300_000, 5),
      ).rejects.toThrow("Failed to upsert rate limit record");
    });
  });

  describe("resetByKey", () => {
    it("should delete the record for the given key", async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await repository.resetByKey("email:user@example.com");

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({
        key: "email:user@example.com",
      });
    });

    it("should not throw when record does not exist", async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

      await expect(
        repository.resetByKey("email:nonexistent@test.com"),
      ).resolves.toBeUndefined();
    });
  });
});
