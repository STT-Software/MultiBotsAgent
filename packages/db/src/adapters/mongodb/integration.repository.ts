import { Db, ObjectId } from "mongodb";
import type { Integration, IntegrationProvider, IntegrationStatus } from "@multibotagents/types";
import type {
  IIntegrationRepository,
  CreateIntegrationData,
  UpdateIntegrationData,
} from "../../interfaces";
import {
  INTEGRATIONS_COLLECTION,
  type IntegrationDocument,
} from "../../schemas/integration.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio Integration. */
function toEntity(doc: IntegrationDocument): Integration {
  return {
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    provider: doc.provider as IntegrationProvider,
    category: doc.category as Integration["category"],
    status: doc.status as IntegrationStatus,
    encryptedAccessToken: doc.encryptedAccessToken,
    encryptedRefreshToken: doc.encryptedRefreshToken,
    tokenExpiresAt: doc.tokenExpiresAt,
    scopes: doc.scopes,
    accountDisplayName: doc.accountDisplayName,
    providerAccountId: doc.providerAccountId,
    calendarId: doc.calendarId,
    lastHealthCheck: doc.lastHealthCheck,
    connectedAt: doc.connectedAt,
    lastUsedAt: doc.lastUsedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Construye los campos mutables del documento (sin `_id` ni timestamps).
 * Los timestamps se añaden en cada sitio según sea `insert` o `upsert`.
 */
function toMutableFields(
  data: CreateIntegrationData,
): Omit<IntegrationDocument, "_id" | "createdAt" | "updatedAt"> {
  return {
    companyId: new ObjectId(data.companyId),
    provider: data.provider,
    category: data.category,
    status: data.status,
    encryptedAccessToken: data.encryptedAccessToken,
    encryptedRefreshToken: data.encryptedRefreshToken,
    tokenExpiresAt: data.tokenExpiresAt,
    scopes: data.scopes,
    accountDisplayName: data.accountDisplayName,
    providerAccountId: data.providerAccountId,
    calendarId: data.calendarId,
    connectedAt: data.connectedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class IntegrationRepository implements IIntegrationRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<IntegrationDocument>(INTEGRATIONS_COLLECTION);
  }

  async create(
    data: Omit<Integration, "id"> | CreateIntegrationData,
  ): Promise<Integration> {
    const now = new Date();
    const doc: Omit<IntegrationDocument, "_id"> = {
      ...toMutableFields(data as CreateIntegrationData),
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(doc as IntegrationDocument);
    return toEntity({ _id: result.insertedId, ...doc } as IntegrationDocument);
  }

  async findById(id: string): Promise<Integration | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<Integration>): Promise<Integration[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.companyId) query.companyId = new ObjectId(filter.companyId);
      if (filter.provider) query.provider = filter.provider;
      if (filter.status) query.status = filter.status;
      if (filter.category) query.category = filter.category;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async findByCompanyAndProvider(
    companyId: string,
    provider: IntegrationProvider,
  ): Promise<Integration | null> {
    const doc = await this.collection.findOne({
      companyId: new ObjectId(companyId),
      provider,
    });
    return doc ? toEntity(doc) : null;
  }

  async findByCompanyId(companyId: string): Promise<Integration[]> {
    const docs = await this.collection
      .find({ companyId: new ObjectId(companyId) })
      .toArray();
    return docs.map(toEntity);
  }

  async findByStatus(status: IntegrationStatus): Promise<Integration[]> {
    const docs = await this.collection.find({ status }).toArray();
    return docs.map(toEntity);
  }

  async update(
    id: string,
    data: Partial<UpdateIntegrationData>,
  ): Promise<Integration> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`Integration not found: ${id}`);
    return toEntity(result);
  }

  async upsertByCompanyAndProvider(
    data: CreateIntegrationData,
  ): Promise<Integration> {
    const now = new Date();
    const result = await this.collection.findOneAndUpdate(
      { companyId: new ObjectId(data.companyId), provider: data.provider },
      {
        $set: { ...toMutableFields(data), updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result) throw new Error("Upsert de integración no retornó documento");
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
