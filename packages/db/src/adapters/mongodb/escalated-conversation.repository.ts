import { Db, ObjectId } from "mongodb";
import {
  ESCALATED_CONVERSATIONS_COLLECTION,
  type EscalatedConversationDocument,
  type EscalatedConversationMessageDocument,
} from "../../schemas/escalated-conversation.schema";

// ─── Domain Entities ─────────────────────────────────────────────────────────

export interface EscalatedConversationMessage {
  id: string;
  sender: "user" | "agent" | "operator";
  content: string;
  timestamp: string;
  type: "text" | "image" | "file";
  status?: "sending" | "sent" | "pending" | "failed";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
}

export interface EscalatedConversation {
  id: string;
  companyId: string;
  userId: string;
  userAvatar?: string;
  agentId: string;
  agentName: string;
  agentType: "rag" | "cotizador" | "agendamiento";
  status: "escalated" | "resolved" | "unassigned";
  escalationType: "explicit" | "agent_detected";
  escalatedAt: string;
  resolvedAt?: string;
  reason: string;
  messages: EscalatedConversationMessage[];
  isSeeded?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IEscalatedConversationRepository {
  findByCompanyAndStatus(companyId: string, status: string): Promise<EscalatedConversation[]>;
  findById(companyId: string, id: string): Promise<EscalatedConversation | null>;
  findByUserIdAndStatus(companyId: string, userId: string, status: string): Promise<EscalatedConversation | null>;
  create(data: Omit<EscalatedConversationDocument, "_id">): Promise<EscalatedConversation>;
  addMessage(companyId: string, conversationId: string, message: Omit<EscalatedConversationMessageDocument, "_id">): Promise<EscalatedConversationMessage>;
  updateStatus(companyId: string, id: string, status: string, resolvedAt?: Date): Promise<void>;
  countByStatus(companyId: string, status: string): Promise<number>;
  findSeeded(companyId: string): Promise<EscalatedConversation[]>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function messageToEntity(doc: EscalatedConversationMessageDocument): EscalatedConversationMessage {
  return {
    id: doc._id.toHexString(),
    sender: doc.sender,
    content: doc.content,
    timestamp: doc.timestamp.toISOString(),
    type: doc.type,
    status: doc.status,
    fileUrl: doc.fileUrl,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    fileMimeType: doc.fileMimeType,
  };
}

function toEntity(doc: EscalatedConversationDocument): EscalatedConversation {
  return {
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    userId: doc.userId,
    userAvatar: doc.userAvatar,
    agentId: doc.agentId,
    agentName: doc.agentName,
    agentType: doc.agentType,
    status: doc.status,
    escalationType: doc.escalationType,
    escalatedAt: doc.escalatedAt.toISOString(),
    resolvedAt: doc.resolvedAt?.toISOString(),
    reason: doc.reason,
    messages: (doc.messages || []).map(messageToEntity),
    isSeeded: doc.isSeeded,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class EscalatedConversationRepository implements IEscalatedConversationRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<EscalatedConversationDocument>(ESCALATED_CONVERSATIONS_COLLECTION);
  }

  async findByCompanyAndStatus(companyId: string, status: string): Promise<EscalatedConversation[]> {
    const docs = await this.collection
      .find({
        companyId: new ObjectId(companyId),
        status: status as EscalatedConversationDocument["status"],
      })
      .sort({ escalatedAt: 1 })
      .toArray();

    return docs.map(toEntity);
  }

  async findById(companyId: string, id: string): Promise<EscalatedConversation | null> {
    const doc = await this.collection.findOne({
      _id: new ObjectId(id),
      companyId: new ObjectId(companyId),
    });
    return doc ? toEntity(doc) : null;
  }

  async findByUserIdAndStatus(companyId: string, userId: string, status: string): Promise<EscalatedConversation | null> {
    const doc = await this.collection.findOne({
      companyId: new ObjectId(companyId),
      userId,
      status: status as EscalatedConversationDocument["status"],
    });
    return doc ? toEntity(doc) : null;
  }

  async create(data: Omit<EscalatedConversationDocument, "_id">): Promise<EscalatedConversation> {
    const result = await this.collection.insertOne(data as EscalatedConversationDocument);
    return toEntity({ _id: result.insertedId, ...data } as EscalatedConversationDocument);
  }

  async addMessage(
    companyId: string,
    conversationId: string,
    message: Omit<EscalatedConversationMessageDocument, "_id">,
  ): Promise<EscalatedConversationMessage> {
    const messageId = new ObjectId();
    const messageDoc: EscalatedConversationMessageDocument = {
      _id: messageId,
      ...message,
    };

    await this.collection.updateOne(
      {
        _id: new ObjectId(conversationId),
        companyId: new ObjectId(companyId),
      },
      {
        $push: { messages: messageDoc },
        $set: { updatedAt: new Date() },
      },
    );

    return messageToEntity(messageDoc);
  }

  async updateStatus(companyId: string, id: string, status: string, resolvedAt?: Date): Promise<void> {
    const $set: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };
    if (resolvedAt) {
      $set.resolvedAt = resolvedAt;
    }

    await this.collection.updateOne(
      {
        _id: new ObjectId(id),
        companyId: new ObjectId(companyId),
      },
      { $set } as any,
    );
  }

  async countByStatus(companyId: string, status: string): Promise<number> {
    return this.collection.countDocuments({
      companyId: new ObjectId(companyId),
      status: status as EscalatedConversationDocument["status"],
    });
  }

  async findSeeded(companyId: string): Promise<EscalatedConversation[]> {
    const docs = await this.collection
      .find({
        companyId: new ObjectId(companyId),
        isSeeded: true,
      })
      .toArray();

    return docs.map(toEntity);
  }
}
