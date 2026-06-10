import { Db, ObjectId } from "mongodb";
import {
  AUDIT_LOGS_COLLECTION,
  AUDIT_LOGS_INDEXES,
  type AuditLogDocument,
} from "../../schemas/audit-log.schema";
import type { IAuditLogRepository } from "../../interfaces/repositories.interface";
import type { AuditLogPayload } from "@multibotagents/types";

export class AuditLogRepository implements IAuditLogRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<AuditLogDocument>(AUDIT_LOGS_COLLECTION);
  }

  async ensureIndexes(): Promise<void> {
    for (const index of AUDIT_LOGS_INDEXES) {
      await this.collection.createIndex(index.key as any, { name: index.name });
    }
  }

  async create(payload: AuditLogPayload): Promise<AuditLogDocument> {
    const doc: AuditLogDocument = {
      companyId: new ObjectId(payload.companyId),
      userId: new ObjectId(payload.userId),
      userEmail: payload.userEmail,
      action: payload.action,
      description: payload.description,
      metadata: payload.metadata ?? {},
      timestamp: payload.timestamp ?? new Date(),
      createdAt: new Date(),
    };

    const result = await this.collection.insertOne(doc);
    return { _id: result.insertedId, ...doc };
  }

  async findPaginated(
    companyId: string,
    limit: number,
    skip: number,
  ): Promise<AuditLogDocument[]> {
    return this.collection
      .find({ companyId: new ObjectId(companyId) })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async countByCompany(companyId: string): Promise<number> {
    return this.collection.countDocuments({
      companyId: new ObjectId(companyId),
    });
  }
}
