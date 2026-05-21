import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { VerifyTokenRepository } from "../verify-token.repository";
import { VERIFY_TOKENS_COLLECTION } from "../../../schemas/verify-token.schema";
import { VerifyTokenType } from "@multibotagents/types";

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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("VerifyTokenRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: VerifyTokenRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new VerifyTokenRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(VERIFY_TOKENS_COLLECTION);
  });

  describe("createForUser", () => {
    it("should create a token with 24h expiration for email_verification type", async () => {
      const userId = new ObjectId().toHexString();
      const token = "a".repeat(64);
      const insertedId = new ObjectId();

      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const result = await repository.createForUser(
        userId,
        VerifyTokenType.EMAIL_VERIFICATION,
        token,
      );

      expect(result.userId).toBe(userId);
      expect(result.type).toBe(VerifyTokenType.EMAIL_VERIFICATION);
      expect(result.token).toBe(token);
      expect(result.usedAt).toBeUndefined();

      // Verify expiresAt is ~24h from now
      const diffMs = result.expiresAt.getTime() - result.createdAt.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    });

    it("should create a token with 1h expiration for password_reset type", async () => {
      const userId = new ObjectId().toHexString();
      const token = "b".repeat(64);
      const insertedId = new ObjectId();

      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const result = await repository.createForUser(
        userId,
        VerifyTokenType.PASSWORD_RESET,
        token,
      );

      const diffMs = result.expiresAt.getTime() - result.createdAt.getTime();
      expect(diffMs).toBe(60 * 60 * 1000);
    });
  });

  describe("findAndMarkUsed", () => {
    it("should use atomic findOneAndUpdate with correct filter", async () => {
      const tokenValue = "c".repeat(64);
      const docId = new ObjectId();
      const userId = new ObjectId();
      const now = new Date();

      mockCollection.findOneAndUpdate.mockResolvedValue({
        _id: docId,
        userId,
        type: VerifyTokenType.EMAIL_VERIFICATION,
        token: tokenValue,
        expiresAt: new Date(now.getTime() + 1000),
        usedAt: now,
        createdAt: new Date(now.getTime() - 1000),
      });

      const result = await repository.findAndMarkUsed(tokenValue);

      expect(result).not.toBeNull();
      expect(result!.token).toBe(tokenValue);

      // Verify the filter includes atomicity conditions
      const filter = mockCollection.findOneAndUpdate.mock.calls[0][0];
      expect(filter.token).toBe(tokenValue);
      expect(filter.usedAt).toEqual({ $eq: null });
      expect(filter.expiresAt).toHaveProperty("$gt");

      // Verify it sets usedAt
      const update = mockCollection.findOneAndUpdate.mock.calls[0][1];
      expect(update.$set.usedAt).toBeInstanceOf(Date);

      // Verify returnDocument: "after"
      const options = mockCollection.findOneAndUpdate.mock.calls[0][2];
      expect(options.returnDocument).toBe("after");
    });

    it("should return null when token is not found or already used", async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null);

      const result = await repository.findAndMarkUsed("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("invalidateAllByUserAndType", () => {
    it("should mark all unused tokens of the given type as used", async () => {
      const userId = new ObjectId().toHexString();
      mockCollection.updateMany.mockResolvedValue({ modifiedCount: 3 });

      await repository.invalidateAllByUserAndType(
        userId,
        VerifyTokenType.EMAIL_VERIFICATION,
      );

      const filter = mockCollection.updateMany.mock.calls[0][0];
      expect(filter.userId).toBeInstanceOf(ObjectId);
      expect(filter.userId.toHexString()).toBe(userId);
      expect(filter.type).toBe(VerifyTokenType.EMAIL_VERIFICATION);
      expect(filter.usedAt).toEqual({ $eq: null });

      const update = mockCollection.updateMany.mock.calls[0][1];
      expect(update.$set.usedAt).toBeInstanceOf(Date);
    });
  });

  describe("findByToken", () => {
    it("should find a token by its value", async () => {
      const tokenValue = "d".repeat(64);
      const docId = new ObjectId();
      const userId = new ObjectId();

      mockCollection.findOne.mockResolvedValue({
        _id: docId,
        userId,
        type: VerifyTokenType.EMAIL_VERIFICATION,
        token: tokenValue,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await repository.findByToken(tokenValue);

      expect(result).not.toBeNull();
      expect(result!.token).toBe(tokenValue);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ token: tokenValue });
    });

    it("should return null when token does not exist", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.findByToken("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findLatestByUserAndType", () => {
    it("should find the latest token sorted by createdAt descending", async () => {
      const userId = new ObjectId().toHexString();
      const docId = new ObjectId();

      mockCollection.findOne.mockResolvedValue({
        _id: docId,
        userId: new ObjectId(userId),
        type: VerifyTokenType.EMAIL_VERIFICATION,
        token: "e".repeat(64),
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await repository.findLatestByUserAndType(
        userId,
        VerifyTokenType.EMAIL_VERIFICATION,
      );

      expect(result).not.toBeNull();

      const callArgs = mockCollection.findOne.mock.calls[0];
      const filter = callArgs[0];
      const options = callArgs[1];

      expect(filter.userId).toBeInstanceOf(ObjectId);
      expect(filter.userId.toHexString()).toBe(userId);
      expect(filter.type).toBe(VerifyTokenType.EMAIL_VERIFICATION);
      expect(options.sort).toEqual({ createdAt: -1 });
    });

    it("should return null when no token exists for user and type", async () => {
      const userId = new ObjectId().toHexString();
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.findLatestByUserAndType(
        userId,
        VerifyTokenType.EMAIL_VERIFICATION,
      );

      expect(result).toBeNull();
    });
  });
});
