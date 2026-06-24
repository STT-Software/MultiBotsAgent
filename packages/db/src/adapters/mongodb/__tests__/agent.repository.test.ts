import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { AgentRepository } from "../agent.repository";
import { AGENTS_COLLECTION } from "../../../schemas/agent.schema";
import type { Agent } from "@multibotagents/types";

// ─── Mock Helpers ────────────────────────────────────────────────────────────

function createMockCollection() {
  const mockToArray = vi.fn();
  const mockFind = vi.fn().mockReturnValue({
    toArray: mockToArray,
  });

  return {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: mockFind,
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    _mockToArray: mockToArray,
  };
}

function createMockDb(collection: ReturnType<typeof createMockCollection>) {
  return {
    collection: vi.fn().mockReturnValue(collection),
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AgentRepository", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockDb: any;
  let repository: AgentRepository;

  beforeEach(() => {
    mockCollection = createMockCollection();
    mockDb = createMockDb(mockCollection);
    repository = new AgentRepository(mockDb);
  });

  it("should use the correct collection name", () => {
    expect(mockDb.collection).toHaveBeenCalledWith(AGENTS_COLLECTION);
  });

  describe("findById", () => {
    it("should return null if agent is not found", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const result = await repository.findById(new ObjectId().toHexString());
      expect(result).toBeNull();
    });

    it("should return the agent domain entity if found", async () => {
      const agentId = new ObjectId();
      const companyId = new ObjectId();
      const dbDoc = {
        _id: agentId,
        companyId,
        nombre: "Test Agent",
        tipo: "rag",
        estado: "activo",
        relevanceThreshold: 0.7,
        topK: 5,
        maxResponseLength: 1000,
        memoryWindow: 10,
        noInfoMessage: "No info",
        errorMessage: "Error",
        language: "es",
        welcomeMessage: "Hello",
        personality: {
          name: "Assistant",
          tone: "friendly",
          restrictions: ["no politics"],
          instructions: "be polite",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCollection.findOne.mockResolvedValue(dbDoc);
      const result = await repository.findById(agentId.toHexString());

      expect(result).not.toBeNull();
      expect(result!.id).toBe(agentId.toHexString());
      expect(result!.companyId).toBe(companyId.toHexString());
      expect(result!.nombre).toBe("Test Agent");
      expect(result!.personality.name).toBe("Assistant");
    });
  });

  describe("findByCompanyId", () => {
    it("should return an empty array if no agents match", async () => {
      mockCollection._mockToArray.mockResolvedValue([]);
      const result = await repository.findByCompanyId(new ObjectId().toHexString());
      expect(result).toEqual([]);
    });

    it("should return matching agents", async () => {
      const agentId = new ObjectId();
      const companyId = new ObjectId();
      const dbDoc = {
        _id: agentId,
        companyId,
        nombre: "Test Agent",
        tipo: "rag",
        estado: "activo",
        relevanceThreshold: 0.7,
        topK: 5,
        maxResponseLength: 1000,
        memoryWindow: 10,
        noInfoMessage: "No info",
        errorMessage: "Error",
        language: "es",
        personality: {
          name: "Assistant",
          tone: "friendly",
          restrictions: [],
          instructions: "be polite",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCollection._mockToArray.mockResolvedValue([dbDoc]);
      const result = await repository.findByCompanyId(companyId.toHexString());

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(agentId.toHexString());
      expect(mockCollection.find).toHaveBeenCalledWith({
        companyId: new ObjectId(companyId.toHexString()),
      });
    });
  });

  describe("create", () => {
    const validData: Omit<Agent, "id"> = {
      companyId: new ObjectId().toHexString(),
      nombre: "New Agent",
      tipo: "rag",
      estado: "activo",
      relevanceThreshold: 0.7,
      topK: 4,
      maxResponseLength: 500,
      memoryWindow: 8,
      noInfoMessage: "Lo siento, no sé",
      errorMessage: "Ocurrió un error",
      language: "es",
      personality: {
        name: "Bot",
        tone: "formal",
        restrictions: ["no info"],
        instructions: "saluda siempre",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should insert agent and return domain entity", async () => {
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const result = await repository.create(validData);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result.id).toBe(insertedId.toHexString());
      expect(result.nombre).toBe("New Agent");
      expect(result.personality.tone).toBe("formal");
    });
  });

  describe("update", () => {
    it("should perform findOneAndUpdate and return updated document", async () => {
      const agentId = new ObjectId();
      const updatedDoc = {
        _id: agentId,
        companyId: new ObjectId(),
        nombre: "Updated Agent",
        tipo: "rag",
        estado: "activo",
        relevanceThreshold: 0.8,
        topK: 5,
        maxResponseLength: 1000,
        memoryWindow: 10,
        noInfoMessage: "No info",
        errorMessage: "Error",
        language: "es",
        personality: {
          name: "Assistant Updated",
          tone: "professional",
          restrictions: [],
          instructions: "be helpfull",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCollection.findOneAndUpdate.mockResolvedValue(updatedDoc);

      const result = await repository.update(agentId.toHexString(), {
        nombre: "Updated Agent",
        personality: {
          name: "Assistant Updated",
          tone: "professional",
          restrictions: [],
          instructions: "be helpfull",
        },
      });

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new ObjectId(agentId.toHexString()) },
        expect.objectContaining({
          $set: expect.objectContaining({
            nombre: "Updated Agent",
            personality: {
              name: "Assistant Updated",
              tone: "professional",
              restrictions: [],
              instructions: "be helpfull",
            },
          }),
        }),
        { returnDocument: "after" }
      );
      expect(result.nombre).toBe("Updated Agent");
      expect(result.personality.name).toBe("Assistant Updated");
    });
  });

  describe("delete", () => {
    it("should return true if document is deleted", async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      const result = await repository.delete(new ObjectId().toHexString());
      expect(result).toBe(true);
    });

    it("should return false if document is not found/deleted", async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
      const result = await repository.delete(new ObjectId().toHexString());
      expect(result).toBe(false);
    });
  });
});
