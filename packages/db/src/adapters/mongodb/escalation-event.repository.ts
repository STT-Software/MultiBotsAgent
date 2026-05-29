import { Db, ObjectId } from "mongodb";
import {
  ESCALATION_EVENTS_COLLECTION,
  type EscalationEventDocument,
} from "../../schemas/escalation-event.schema";

// ─── Domain Entity ───────────────────────────────────────────────────────────

export interface EscalationEvent {
  id: string;
  conversationId: string;
  companyId: string;
  agentId: string;
  agentName: string;
  escalationType: "explicit" | "agent_detected";
  reason: string;
  escalatedAt: string;
  resolvedAt: string;
  resolvedBy: string;
  durationMinutes: number;
  createdAt: string;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IEscalationEventRepository {
  create(data: Omit<EscalationEventDocument, "_id">): Promise<EscalationEvent>;
  findByCompany(companyId: string, options?: { limit?: number; today?: boolean }): Promise<EscalationEvent[]>;
  getSummary(companyId: string): Promise<{ todayCount: number; avgDurationMinutes: number }>;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function toEntity(doc: EscalationEventDocument): EscalationEvent {
  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId.toHexString(),
    companyId: doc.companyId.toHexString(),
    agentId: doc.agentId,
    agentName: doc.agentName,
    escalationType: doc.escalationType,
    reason: doc.reason,
    escalatedAt: doc.escalatedAt.toISOString(),
    resolvedAt: doc.resolvedAt.toISOString(),
    resolvedBy: doc.resolvedBy,
    durationMinutes: doc.durationMinutes,
    createdAt: doc.createdAt.toISOString(),
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class EscalationEventRepository implements IEscalationEventRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<EscalationEventDocument>(ESCALATION_EVENTS_COLLECTION);
  }

  async create(data: Omit<EscalationEventDocument, "_id">): Promise<EscalationEvent> {
    const result = await this.collection.insertOne(data as EscalationEventDocument);
    return toEntity({ _id: result.insertedId, ...data } as EscalationEventDocument);
  }

  async findByCompany(companyId: string, options?: { limit?: number; today?: boolean }): Promise<EscalationEvent[]> {
    const filter: Record<string, unknown> = {
      companyId: new ObjectId(companyId),
    };

    if (options?.today) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: startOfDay };
    }

    const limit = options?.limit ?? 20;

    const docs = await this.collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map(toEntity);
  }

  async getSummary(companyId: string): Promise<{ todayCount: number; avgDurationMinutes: number }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count today
    const todayCount = await this.collection.countDocuments({
      companyId: new ObjectId(companyId),
      createdAt: { $gte: startOfDay },
    });

    // Average duration last 30 days
    const avgResult = await this.collection
      .aggregate<{ avgDuration: number | null }>([
        {
          $match: {
            companyId: new ObjectId(companyId),
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: "$durationMinutes" },
          },
        },
      ])
      .toArray();

    const avgDurationMinutes = Math.round(avgResult[0]?.avgDuration ?? 0);

    return { todayCount, avgDurationMinutes };
  }
}
