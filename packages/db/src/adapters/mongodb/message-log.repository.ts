import { Db, ObjectId } from "mongodb";
import type { MessageLog } from "@multibotagents/types";
import type { IMessageLogRepository } from "../../interfaces";
import {
  MESSAGE_LOGS_COLLECTION,
  type MessageLogDocument,
} from "../../schemas/message-log.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

function toEntity(doc: MessageLogDocument): MessageLog {
  return {
    id: doc._id.toHexString(),
    channelId: doc.channelId.toHexString(),
    conversationId: doc.conversationId,
    direction: doc.direction,
    waMessageId: doc.waMessageId,
    content: doc.content,
    status: doc.status,
    errorCode: doc.errorCode,
    errorMessage: doc.errorMessage,
    timestamp: doc.timestamp,
    statusUpdatedAt: doc.statusUpdatedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class MessageLogRepository implements IMessageLogRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<MessageLogDocument>(MESSAGE_LOGS_COLLECTION);
  }

  async findById(id: string): Promise<MessageLog | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<MessageLog>): Promise<MessageLog[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.channelId) query.channelId = new ObjectId(filter.channelId);
      if (filter.conversationId) query.conversationId = filter.conversationId;
      if (filter.direction) query.direction = filter.direction;
      if (filter.waMessageId) query.waMessageId = filter.waMessageId;
      if (filter.status) query.status = filter.status;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<MessageLog, "id">): Promise<MessageLog> {
    const doc: Omit<MessageLogDocument, "_id"> = {
      channelId: new ObjectId(entity.channelId),
      conversationId: entity.conversationId,
      direction: entity.direction,
      waMessageId: entity.waMessageId,
      content: entity.content,
      status: entity.status,
      errorCode: entity.errorCode,
      errorMessage: entity.errorMessage,
      timestamp: entity.timestamp,
      statusUpdatedAt: entity.statusUpdatedAt,
    };
    const result = await this.collection.insertOne(doc as MessageLogDocument);
    return toEntity({ _id: result.insertedId, ...doc } as MessageLogDocument);
  }

  async update(id: string, entity: Partial<MessageLog>): Promise<MessageLog> {
    const updateData: Record<string, unknown> = { ...entity };
    delete updateData.id;
    if (entity.channelId) {
      updateData.channelId = new ObjectId(entity.channelId);
    }
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );
    if (!result) throw new Error(`MessageLog not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  async findByWaMessageId(waMessageId: string): Promise<MessageLog | null> {
    const doc = await this.collection.findOne({ waMessageId });
    return doc ? toEntity(doc) : null;
  }

  async updateStatus(
    waMessageId: string,
    status: MessageLog["status"],
    details?: { errorCode?: number; errorMessage?: string }
  ): Promise<void> {
    const $set: Record<string, unknown> = {
      status,
      statusUpdatedAt: new Date(),
    };
    if (details) {
      if (details.errorCode !== undefined) $set.errorCode = details.errorCode;
      if (details.errorMessage !== undefined) $set.errorMessage = details.errorMessage;
    }
    await this.collection.updateOne({ waMessageId }, { $set });
  }
}
