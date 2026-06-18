import { Db, ObjectId } from "mongodb";
import type { IntegrationProvider } from "@multibotagents/types";
import type {
  IOAuthStateRepository,
  CreateOAuthStateData,
  OAuthStateRecord,
} from "../../interfaces";
import {
  OAUTH_STATES_COLLECTION,
  type OAuthStateDocument,
} from "../../schemas/oauth-state.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a un registro de dominio con ids string. */
function toRecord(doc: OAuthStateDocument): OAuthStateRecord {
  return {
    jti: doc._id,
    companyId: doc.companyId.toHexString(),
    agentId: doc.agentId?.toHexString(),
    provider: doc.provider as IntegrationProvider,
    used: doc.used,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class OAuthStateRepository implements IOAuthStateRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<OAuthStateDocument>(OAUTH_STATES_COLLECTION);
  }

  async create(data: CreateOAuthStateData): Promise<void> {
    const doc: OAuthStateDocument = {
      _id: data.jti,
      companyId: new ObjectId(data.companyId),
      agentId: data.agentId ? new ObjectId(data.agentId) : undefined,
      provider: data.provider,
      used: false,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    };
    await this.collection.insertOne(doc);
  }

  async consume(jti: string): Promise<OAuthStateRecord | null> {
    // Marca el state como usado solo si está vigente y no consumido: impide
    // el reuso del `code` (replay) de forma atómica a nivel de base de datos.
    const result = await this.collection.findOneAndUpdate(
      { _id: jti, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true } },
      { returnDocument: "after" },
    );
    return result ? toRecord(result) : null;
  }
}
