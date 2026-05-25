import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import {
  MongoVectorSearchService,
  type EmbeddingService,
} from "../knowledge-vector-search";

// ─── Mock Helpers ────────────────────────────────────────────────────────────

function createMockEmbeddingService(): EmbeddingService {
  return {
    generateEmbedding: vi.fn().mockResolvedValue(Array(1024).fill(0.1)),
  };
}

function createMockCursor(results: unknown[] = []) {
  return {
    toArray: vi.fn().mockResolvedValue(results),
  };
}

function createMockCollection(cursor = createMockCursor()) {
  return {
    aggregate: vi.fn().mockReturnValue(cursor),
  } as any;
}

function createFakeFragmentDoc(overrides: Partial<{
  _id: ObjectId;
  content: string;
  metadata: { sourceTitle: string; section?: string; page?: number };
  sourceId: string;
  score: number;
  agentId: string;
}> = {}) {
  return {
    _id: overrides._id ?? new ObjectId(),
    content: overrides.content ?? "Contenido del fragmento de prueba",
    metadata: overrides.metadata ?? {
      sourceTitle: "Documento de prueba",
      section: "Introducción",
      page: 1,
    },
    sourceId: overrides.sourceId ?? "source-123",
    score: overrides.score ?? 0.95,
    agentId: overrides.agentId ?? "agent-001",
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("MongoVectorSearchService", () => {
  let mockCollection: ReturnType<typeof createMockCollection>;
  let mockEmbeddingService: EmbeddingService;
  let service: MongoVectorSearchService;

  beforeEach(() => {
    mockEmbeddingService = createMockEmbeddingService();
    mockCollection = createMockCollection();
    service = new MongoVectorSearchService(mockCollection, mockEmbeddingService);
  });

  describe("search", () => {
    it("genera embedding de la query antes de buscar", async () => {
      const query = "¿Cuál es la política de devoluciones?";

      await service.search("agent-001", query, 5);

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(query);
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledTimes(1);
    });

    it("retorna resultados con fragmentId, content, score y metadata", async () => {
      const docId = new ObjectId();
      const fakeDoc = createFakeFragmentDoc({
        _id: docId,
        content: "Política de devoluciones: 30 días hábiles.",
        metadata: {
          sourceTitle: "Manual de políticas",
          section: "Devoluciones",
          page: 5,
        },
        sourceId: "source-456",
        score: 0.92,
      });

      const cursor = createMockCursor([fakeDoc]);
      mockCollection = createMockCollection(cursor);
      service = new MongoVectorSearchService(mockCollection, mockEmbeddingService);

      const results = await service.search("agent-001", "devoluciones", 5);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        fragmentId: docId.toHexString(),
        content: "Política de devoluciones: 30 días hábiles.",
        score: 0.92,
        metadata: {
          sourceId: "source-456",
          sourceTitle: "Manual de políticas",
          section: "Devoluciones",
          page: 5,
        },
      });
    });

    it("filtra por agentId en el pipeline $vectorSearch (aislamiento)", async () => {
      const agentId = "agent-aislado-xyz";

      await service.search(agentId, "consulta de prueba", 3);

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const vectorSearchStage = pipeline[0].$vectorSearch;

      expect(vectorSearchStage.filter).toEqual({ agentId });
    });

    it("retorna array vacío cuando no hay fragmentos", async () => {
      const cursor = createMockCursor([]);
      mockCollection = createMockCollection(cursor);
      service = new MongoVectorSearchService(mockCollection, mockEmbeddingService);

      const results = await service.search("agent-sin-datos", "cualquier consulta", 10);

      expect(results).toEqual([]);
      expect(results).toHaveLength(0);
    });

    it("respeta topK como límite máximo en $vectorSearch", async () => {
      const topK = 7;

      await service.search("agent-001", "consulta", topK);

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const vectorSearchStage = pipeline[0].$vectorSearch;

      expect(vectorSearchStage.limit).toBe(topK);
    });

    it("configura numCandidates como topK * 10", async () => {
      const topK = 5;

      await service.search("agent-001", "consulta", topK);

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const vectorSearchStage = pipeline[0].$vectorSearch;

      expect(vectorSearchStage.numCandidates).toBe(topK * 10);
    });

    it("usa el índice knowledge_vector_index y path embedding", async () => {
      await service.search("agent-001", "consulta", 5);

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const vectorSearchStage = pipeline[0].$vectorSearch;

      expect(vectorSearchStage.index).toBe("knowledge_vector_index");
      expect(vectorSearchStage.path).toBe("embedding");
    });

    it("pasa el embedding generado como queryVector", async () => {
      const fakeEmbedding = Array(1024).fill(0.5);
      (mockEmbeddingService.generateEmbedding as ReturnType<typeof vi.fn>)
        .mockResolvedValue(fakeEmbedding);

      await service.search("agent-001", "consulta", 5);

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const vectorSearchStage = pipeline[0].$vectorSearch;

      expect(vectorSearchStage.queryVector).toBe(fakeEmbedding);
    });

    it("mapea múltiples resultados correctamente", async () => {
      const docs = [
        createFakeFragmentDoc({ score: 0.98, content: "Fragmento A" }),
        createFakeFragmentDoc({ score: 0.85, content: "Fragmento B" }),
        createFakeFragmentDoc({ score: 0.72, content: "Fragmento C" }),
      ];

      const cursor = createMockCursor(docs);
      mockCollection = createMockCollection(cursor);
      service = new MongoVectorSearchService(mockCollection, mockEmbeddingService);

      const results = await service.search("agent-001", "consulta", 5);

      expect(results).toHaveLength(3);
      expect(results[0]!.content).toBe("Fragmento A");
      expect(results[0]!.score).toBe(0.98);
      expect(results[1]!.content).toBe("Fragmento B");
      expect(results[1]!.score).toBe(0.85);
      expect(results[2]!.content).toBe("Fragmento C");
      expect(results[2]!.score).toBe(0.72);
    });
  });
});
