import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { RefreshTokenRepository } from "../refresh-token.repository";
import { REFRESH_TOKENS_COLLECTION } from "../../../schemas/refresh-token.schema";

// ─── Mock Helpers ────────────────────────────────────────────────────────────

function createMockCollection() {
  return {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
    deleteOne: vi.fn(),
  };
}

function createMockDb(collection: ReturnType<typeof createMockCollection>) {
  return {
    collection: vi.fn().mockReturnValue(collection),
  } as any;
}

function createMockSession() {
  return { id: "mock-session" } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RefreshTokenRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: RefreshTokenRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new RefreshTokenRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(REFRESH_TOKENS_COLLECTION);
  });

  describe("revokeAllByUserId", () => {
    it("should call updateMany with correct filter for non-revoked tokens", async () => {
      const userId = new ObjectId().toHexString();
      const session = createMockSession();
      mockCollection.updateMany.mockResolvedValue({ modifiedCount: 3 });

      await repository.revokeAllByUserId(userId, session);

      expect(mockCollection.updateMany).toHaveBeenCalledWith(
        { userId: new ObjectId(userId), revoked: false },
        { $set: { revoked: true } },
        { session },
      );
    });

    it("should pass the session to updateMany for transactional safety", async () => {
      const userId = new ObjectId().toHexString();
      const session = createMockSession();
      mockCollection.updateMany.mockResolvedValue({ modifiedCount: 0 });

      await repository.revokeAllByUserId(userId, session);

      const callArgs = mockCollection.updateMany.mock.calls[0];
      expect(callArgs[2]).toEqual({ session });
    });

    it("should set revoked to true for all matching tokens", async () => {
      const userId = new ObjectId().toHexString();
      const session = createMockSession();
      mockCollection.updateMany.mockResolvedValue({ modifiedCount: 5 });

      await repository.revokeAllByUserId(userId, session);

      const updateOp = mockCollection.updateMany.mock.calls[0][1];
      expect(updateOp.$set.revoked).toBe(true);
    });

    it("should only target tokens that are not already revoked", async () => {
      const userId = new ObjectId().toHexString();
      const session = createMockSession();
      mockCollection.updateMany.mockResolvedValue({ modifiedCount: 1 });

      await repository.revokeAllByUserId(userId, session);

      const filter = mockCollection.updateMany.mock.calls[0][0];
      expect(filter.revoked).toBe(false);
    });

    it("should convert userId string to ObjectId in the filter", async () => {
      const userId = new ObjectId().toHexString();
      const session = createMockSession();
      mockCollection.updateMany.mockResolvedValue({ modifiedCount: 0 });

      await repository.revokeAllByUserId(userId, session);

      const filter = mockCollection.updateMany.mock.calls[0][0];
      expect(filter.userId).toBeInstanceOf(ObjectId);
      expect(filter.userId.toHexString()).toBe(userId);
    });
  });
});
