import { Db, ObjectId } from "mongodb";
import {
  type EmailQueueItem,
  EmailQueueStatus,
} from "@multibotagents/types";
import type { IEmailQueueRepository, EnqueueEmailData } from "../../interfaces";
import {
  EMAIL_QUEUE_COLLECTION,
  type EmailQueueDocument,
} from "../../schemas/email-queue.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio EmailQueueItem. */
function toEntity(doc: EmailQueueDocument): EmailQueueItem {
  return {
    id: doc._id.toHexString(),
    to: doc.to,
    template: doc.template,
    payload: doc.payload,
    status: doc.status,
    attempts: doc.attempts,
    nextRetryAt: doc.nextRetryAt,
    lastError: doc.lastError,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class EmailQueueRepository implements IEmailQueueRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<EmailQueueDocument>(
      EMAIL_QUEUE_COLLECTION,
    );
  }

  /**
   * Encola un email para envío.
   * Establece valores por defecto: status='pending', attempts=0, timestamps=now.
   */
  async enqueue(item: EnqueueEmailData): Promise<EmailQueueItem> {
    const now = new Date();
    const doc: Omit<EmailQueueDocument, "_id"> = {
      to: item.to,
      template: item.template,
      payload: item.payload,
      status: EmailQueueStatus.PENDING as EmailQueueDocument["status"],
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(
      doc as EmailQueueDocument,
    );

    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as EmailQueueDocument);
  }

  async findById(id: string): Promise<EmailQueueItem | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<EmailQueueItem>): Promise<EmailQueueItem[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.status) query.status = filter.status;
      if (filter.template) query.template = filter.template;
      if (filter.to) query.to = filter.to;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<EmailQueueItem, "id">): Promise<EmailQueueItem> {
    const doc: Omit<EmailQueueDocument, "_id"> = {
      to: entity.to,
      template: entity.template,
      payload: entity.payload,
      status: entity.status,
      attempts: entity.attempts,
      nextRetryAt: entity.nextRetryAt,
      lastError: entity.lastError,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    const result = await this.collection.insertOne(
      doc as EmailQueueDocument,
    );
    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as EmailQueueDocument);
  }

  async update(
    id: string,
    entity: Partial<EmailQueueItem>,
  ): Promise<EmailQueueItem> {
    const { id: _id, ...updateData } = entity;
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`EmailQueueItem not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
