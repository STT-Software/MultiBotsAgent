import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { CompanyRepository } from "../company.repository";
import { COMPANIES_COLLECTION } from "../../../schemas/company.schema";

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

function createMockSession() {
  return { id: "mock-session" } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CompanyRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: CompanyRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new CompanyRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(COMPANIES_COLLECTION);
  });

  describe("createWithSession", () => {
    const validData = {
      name: "Test Company",
      country: "CO",
      category: "barberia",
      size: "2-5",
      phone: "+573001234567",
      referralSource: "google",
    };

    it("should call insertOne with session", async () => {
      const insertedId = new ObjectId();
      const session = createMockSession();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      await repository.createWithSession(validData, session);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.any(Object),
        { session },
      );
    });

    it("should set status to 'active'", async () => {
      const insertedId = new ObjectId();
      const session = createMockSession();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      await repository.createWithSession(validData, session);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc.status).toBe("active");
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const insertedId = new ObjectId();
      const session = createMockSession();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const before = new Date();
      await repository.createWithSession(validData, session);
      const after = new Date();

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc.createdAt).toBeInstanceOf(Date);
      expect(insertedDoc.updatedAt).toBeInstanceOf(Date);
      expect(insertedDoc.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(insertedDoc.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(insertedDoc.createdAt).toEqual(insertedDoc.updatedAt);
    });

    it("should map all input fields to the document", async () => {
      const insertedId = new ObjectId();
      const session = createMockSession();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      await repository.createWithSession(validData, session);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc.name).toBe(validData.name);
      expect(insertedDoc.country).toBe(validData.country);
      expect(insertedDoc.category).toBe(validData.category);
      expect(insertedDoc.size).toBe(validData.size);
      expect(insertedDoc.phone).toBe(validData.phone);
      expect(insertedDoc.referralSource).toBe(validData.referralSource);
    });

    it("should return a Company entity with an id", async () => {
      const insertedId = new ObjectId();
      const session = createMockSession();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const result = await repository.createWithSession(validData, session);

      expect(result.id).toBe(insertedId.toHexString());
      expect(result.name).toBe(validData.name);
      expect(result.status).toBe("active");
    });

    it("should handle optional fields being undefined", async () => {
      const insertedId = new ObjectId();
      const session = createMockSession();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const dataWithoutOptionals = {
        name: "Minimal Company",
        country: "MX",
        category: "barberia",
        size: "1",
      };

      await repository.createWithSession(dataWithoutOptionals, session);

      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc.phone).toBeUndefined();
      expect(insertedDoc.referralSource).toBeUndefined();
    });
  });
});
