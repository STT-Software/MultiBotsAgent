import { Db } from "mongodb";
import type { ProcessedMessage } from "@multibotagents/types";
import type { IProcessedMessageRepository } from "../../interfaces";
import {
  PROCESSED_MESSAGES_COLLECTION,
  type ProcessedMessageDocument,
} from "../../schemas/processed-message.schema";

export class ProcessedMessageRepository implements IProcessedMessageRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<ProcessedMessageDocument>(PROCESSED_MESSAGES_COLLECTION);
  }

  async create(message: ProcessedMessage): Promise<ProcessedMessage> {
    const doc: Omit<ProcessedMessageDocument, "_id"> = {
      waMessageId: message.waMessageId,
      receivedAt: message.receivedAt,
      expiresAt: message.expiresAt,
    };
    await this.collection.insertOne(doc as ProcessedMessageDocument);
    return message;
  }

  async findByWaMessageId(waMessageId: string): Promise<ProcessedMessage | null> {
    const doc = await this.collection.findOne({ waMessageId });
    if (!doc) return null;
    return {
      waMessageId: doc.waMessageId,
      receivedAt: doc.receivedAt,
      expiresAt: doc.expiresAt,
    };
  }
}
