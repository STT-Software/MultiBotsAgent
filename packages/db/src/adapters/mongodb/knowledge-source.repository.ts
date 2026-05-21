import { Db, ObjectId } from "mongodb";
import type {
  KnowledgeSource,
  KnowledgeSourceStatus,
  ProcessingProgress,
} from "@multibotagents/types";
import type { Repository } from "../../interfaces/repository.interface";
import {
  KNOWLEDGE_SOURCES_COLLECTION,
  type KnowledgeSourceDocument,
} from "../../schemas/knowledge-source.schema";

// ─── Repository Interface ────────────────────────────────────────────────────

/**
 * Interfaz del repositorio de fuentes de conocimiento.
 * Extiende el contrato base con métodos específicos del dominio.
 *
 * Valida: Requisitos 10.1, 10.2, 11.6
 */
export interface IKnowledgeSourceRepository extends Repository<KnowledgeSource> {
  findByAgentId(agentId: string): Promise<KnowledgeSource[]>;
  updateStatus(
    id: string,
    status: KnowledgeSourceStatus,
    extra?: Partial<KnowledgeSource>,
  ): Promise<KnowledgeSource>;
  updateProgress(id: string, progress: ProcessingProgress): Promise<void>;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio KnowledgeSource. */
function toEntity(doc: KnowledgeSourceDocument): KnowledgeSource {
  return {
    id: doc._id.toHexString(),
    agentId: doc.agentId,
    companyId: doc.companyId,
    title: doc.title,
    type: doc.type,
    format: doc.format,
    originalFileKey: doc.originalFileKey,
    fileSizeBytes: doc.fileSizeBytes,
    status: doc.status,
    progress: doc.progress,
    fragmentCount: doc.fragmentCount,
    errorReason: doc.errorReason,
    metadata: doc.metadata,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    processedAt: doc.processedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class KnowledgeSourceRepository implements IKnowledgeSourceRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<KnowledgeSourceDocument>(
      KNOWLEDGE_SOURCES_COLLECTION,
    );
  }

  async findByAgentId(agentId: string): Promise<KnowledgeSource[]> {
    const docs = await this.collection.find({ agentId }).toArray();
    return docs.map(toEntity);
  }

  async updateStatus(
    id: string,
    status: KnowledgeSourceStatus,
    extra?: Partial<KnowledgeSource>,
  ): Promise<KnowledgeSource> {
    const { id: _id, ...extraFields } = extra ?? {};
    const updateFields: Record<string, unknown> = {
      ...extraFields,
      status,
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`KnowledgeSource not found: ${id}`);
    return toEntity(result);
  }

  async updateProgress(id: string, progress: ProcessingProgress): Promise<void> {
    const result = await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { progress, updatedAt: new Date() } },
    );
    if (result.matchedCount === 0) {
      throw new Error(`KnowledgeSource not found: ${id}`);
    }
  }

  async findById(id: string): Promise<KnowledgeSource | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<KnowledgeSource>): Promise<KnowledgeSource[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.agentId) query.agentId = filter.agentId;
      if (filter.companyId) query.companyId = filter.companyId;
      if (filter.status) query.status = filter.status;
      if (filter.type) query.type = filter.type;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<KnowledgeSource, "id">): Promise<KnowledgeSource> {
    const now = new Date();
    const doc: Omit<KnowledgeSourceDocument, "_id"> = {
      agentId: entity.agentId,
      companyId: entity.companyId,
      title: entity.title,
      type: entity.type,
      format: entity.format,
      originalFileKey: entity.originalFileKey,
      fileSizeBytes: entity.fileSizeBytes,
      status: entity.status,
      progress: entity.progress,
      fragmentCount: entity.fragmentCount,
      errorReason: entity.errorReason,
      metadata: entity.metadata,
      createdAt: entity.createdAt ?? now,
      updatedAt: entity.updatedAt ?? now,
      processedAt: entity.processedAt,
    };

    const result = await this.collection.insertOne(doc as KnowledgeSourceDocument);
    return toEntity({ _id: result.insertedId, ...doc } as KnowledgeSourceDocument);
  }

  async update(id: string, entity: Partial<KnowledgeSource>): Promise<KnowledgeSource> {
    const { id: _id, ...updateData } = entity;
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`KnowledgeSource not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
