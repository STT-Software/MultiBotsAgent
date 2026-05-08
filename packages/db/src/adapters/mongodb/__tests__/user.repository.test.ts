import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { UserRepository } from "../user.repository";
import { USERS_COLLECTION } from "../../../schemas/user.schema";

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

describe("UserRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: UserRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new UserRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(USERS_COLLECTION);
  });

  describe("findByEmail", () => {
    it("should normalize email to lowercase before searching", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      await repository.findByEmail("User@Example.COM");

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { email: "user@example.com" },
        expect.objectContaining({
          collation: { locale: "en", strength: 2 },
        }),
      );
    });

    it("should use collation for case-insensitive search", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      await repository.findByEmail("test@test.com");

      const options = mockCollection.findOne.mock.calls[0][1];
      expect(options.collation).toEqual({ locale: "en", strength: 2 });
    });

    it("should return null when user is not found", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail("notfound@test.com");

      expect(result).toBeNull();
    });

    it("should return a User entity when found", async () => {
      const companyId = new ObjectId();
      const userId = new ObjectId();
      mockCollection.findOne.mockResolvedValue({
        _id: userId,
        email: "user@example.com",
        passwordHash: "$2b$12$hashedpassword",
        emailVerified: false,
        companyId,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const result = await repository.findByEmail("USER@EXAMPLE.COM");

      expect(result).not.toBeNull();
      expect(result!.id).toBe(userId.toHexString());
      expect(result!.email).toBe("user@example.com");
      expect(result!.companyId).toBe(companyId.toHexString());
    });

    it("should handle emails with mixed casing consistently", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      await repository.findByEmail("TeSt@ExAmPlE.CoM");

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { email: "test@example.com" },
        expect.any(Object),
      );
    });
  });
});
