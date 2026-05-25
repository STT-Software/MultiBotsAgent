import { Db, ObjectId } from "mongodb";
import type { Channel } from "@multibotagents/types";
import type {
  IChannelRepository,
  CreateChannelData,
  UpdateChannelData,
  UpdateCredentialsData,
} from "../../interfaces";
import {
  CHANNELS_COLLECTION,
  type ChannelDocument,
} from "../../schemas/channel.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio Channel. */
function toEntity(doc: ChannelDocument): Channel {
  return {
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    agentId: doc.agentId.toHexString(),
    provider: doc.provider,
    status: doc.status,
    phoneNumberId: doc.phoneNumberId,
    wabaId: doc.wabaId,
    encryptedToken: doc.encryptedToken,
    displayName: doc.displayName,
    webhookOverrideUrl: doc.webhookOverrideUrl,
    connectedAt: doc.connectedAt,
    lastHealthCheck: doc.lastHealthCheck,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class ChannelRepository implements IChannelRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<ChannelDocument>(CHANNELS_COLLECTION);
  }

  async create(data: Omit<Channel, "id"> | CreateChannelData): Promise<Channel> {
    const now = new Date();
    const doc: Omit<ChannelDocument, "_id"> = {
      companyId: new ObjectId(data.companyId),
      agentId: new ObjectId(data.agentId),
      provider: data.provider,
      status: data.status,
      phoneNumberId: data.phoneNumberId,
      wabaId: data.wabaId,
      encryptedToken: data.encryptedToken,
      displayName: data.displayName,
      webhookOverrideUrl: (data as CreateChannelData).webhookOverrideUrl,
      connectedAt: data.connectedAt,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(doc as ChannelDocument);
    return toEntity({ _id: result.insertedId, ...doc } as ChannelDocument);
  }

  async findById(id: string): Promise<Channel | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<Channel>): Promise<Channel[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.agentId) query.agentId = new ObjectId(filter.agentId);
      if (filter.companyId) query.companyId = new ObjectId(filter.companyId);
      if (filter.phoneNumberId) query.phoneNumberId = filter.phoneNumberId;
      if (filter.status) query.status = filter.status;
      if (filter.provider) query.provider = filter.provider;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async findByPhoneNumberId(phoneNumberId: string): Promise<Channel | null> {
    const doc = await this.collection.findOne({ phoneNumberId });
    return doc ? toEntity(doc) : null;
  }

  async findActiveByPhoneNumberId(phoneNumberId: string): Promise<Channel | null> {
    const doc = await this.collection.findOne({
      phoneNumberId,
      status: { $in: ["connected", "partially_connected"] },
    });
    return doc ? toEntity(doc) : null;
  }

  async findByAgentId(agentId: string): Promise<Channel | null> {
    const doc = await this.collection.findOne({
      agentId: new ObjectId(agentId),
    });
    return doc ? toEntity(doc) : null;
  }

  async update(id: string, data: Partial<UpdateChannelData>): Promise<Channel> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`Channel not found: ${id}`);
    return toEntity(result);
  }

  async updateCredentials(id: string, data: UpdateCredentialsData): Promise<Channel> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          encryptedToken: data.encryptedToken,
          status: data.status,
          connectedAt: data.connectedAt,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`Channel not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
