import { Db, ObjectId } from "mongodb";
import type { KnowledgeFragment } from "@multibotagents/types";
import type { Repository } from "../../interfaces/repository.interface";
import {
  KNOWLEDGE_FRAGMENTS_COLLECTION,
  type KnowledgeFragmentDocument,
} from "../../schemas/knowledge-fragment.schema";

// ─── Repository Interface ────────────────────────────────────────────────────

/**
 * Interfaz del repositorio de fragmentos de conocimiento.
 * Extiende el repositorio base con métodos específicos para
 * operaciones en lote y consultas por sourceId.
 *
 * Valida: Requisitos 6.1, 6.2, 8.3
 */
export interface IKnowledgeFragmentRepository extends Repository<KnowledgeFragment> {
  /** Busca todos los fragmentos asociados a un sourceId. */
  findBySourceId(sourceId: string): Promise<KnowledgeFragment[]>;
  /** Elimina todos los fragmentos asociados a un sourceId. Retorna la cantidad eliminada. */
  deleteBySourceId(sourceId: string): Promise<number>;
  /** Crea múltiples fragmentos en una sola operación usando insertMany. */
  bulkCreate(fragments: Omit<KnowledgeFragment, "id">[]): Promise<KnowledgeFragment[]>;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio KnowledgeFragment. */
function toEntity(doc: KnowledgeFragmentDocument): KnowledgeFragment {
  return {
    id: doc._id.toHexString(),
    sourceId: doc.sourceId,
    agentId: doc.agentId,
    content: doc.content,
    embedding: doc.embedding,
    position: doc.position,
    tokenCount: doc.tokenCount,
    metadata: {
      section: doc.metadata.section,
      page: doc.metadata.page,
      sourceTitle: doc.metadata.sourceTitle,
    },
    createdAt: doc.createdAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class KnowledgeFragmentRepository implements IKnowledgeFragmentRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<KnowledgeFragmentDocument>(
      KNOWLEDGE_FRAGMENTS_COLLECTION,
    );
  }

  async findBySourceId(sourceId: string): Promise<KnowledgeFragment[]> {
    const docs = await this.collection.find({ sourceId }).toArray();
    return docs.map(toEntity);
  }

  async deleteBySourceId(sourceId: string): Promise<number> {
    const result = await this.collection.deleteMany({ sourceId });
    return result.deletedCount;
  }

  /**
   * Crea múltiples fragmentos en una sola operación con `insertMany`.
   * Optimizado para escritura eficiente de fragmentos generados por el pipeline de indexación.
   */
  async bulkCreate(
    fragments: Omit<KnowledgeFragment, "id">[],
  ): Promise<KnowledgeFragment[]> {
    if (fragments.length === 0) return [];

    const docs: Omit<KnowledgeFragmentDocument, "_id">[] = fragments.map(
      (fragment) => ({
        sourceId: fragment.sourceId,
        agentId: fragment.agentId,
        content: fragment.content,
        embedding: fragment.embedding,
        position: fragment.position,
        tokenCount: fragment.tokenCount,
        metadata: {
          section: fragment.metadata.section,
          page: fragment.metadata.page,
          sourceTitle: fragment.metadata.sourceTitle,
        },
        createdAt: fragment.createdAt,
      }),
    );

    const result = await this.collection.insertMany(
      docs as KnowledgeFragmentDocument[],
    );

    return docs.map((doc, index) =>
      toEntity({
        _id: result.insertedIds[index],
        ...doc,
      } as KnowledgeFragmentDocument),
    );
  }

  async findById(id: string): Promise<KnowledgeFragment | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<KnowledgeFragment>): Promise<KnowledgeFragment[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.sourceId) query.sourceId = filter.sourceId;
      if (filter.agentId) query.agentId = filter.agentId;
      if (filter.position !== undefined) query.position = filter.position;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<KnowledgeFragment, "id">): Promise<KnowledgeFragment> {
    const doc: Omit<KnowledgeFragmentDocument, "_id"> = {
      sourceId: entity.sourceId,
      agentId: entity.agentId,
      content: entity.content,
      embedding: entity.embedding,
      position: entity.position,
      tokenCount: entity.tokenCount,
      metadata: {
        section: entity.metadata.section,
        page: entity.metadata.page,
        sourceTitle: entity.metadata.sourceTitle,
      },
      createdAt: entity.createdAt,
    };

    const result = await this.collection.insertOne(
      doc as KnowledgeFragmentDocument,
    );

    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as KnowledgeFragmentDocument);
  }

  async update(
    id: string,
    entity: Partial<KnowledgeFragment>,
  ): Promise<KnowledgeFragment> {
    const { id: _id, ...updateData } = entity;
    const updateFields: Record<string, unknown> = {};

    if (updateData.sourceId !== undefined) updateFields.sourceId = updateData.sourceId;
    if (updateData.agentId !== undefined) updateFields.agentId = updateData.agentId;
    if (updateData.content !== undefined) updateFields.content = updateData.content;
    if (updateData.embedding !== undefined) updateFields.embedding = updateData.embedding;
    if (updateData.position !== undefined) updateFields.position = updateData.position;
    if (updateData.tokenCount !== undefined) updateFields.tokenCount = updateData.tokenCount;
    if (updateData.metadata !== undefined) updateFields.metadata = updateData.metadata;

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`KnowledgeFragment not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
