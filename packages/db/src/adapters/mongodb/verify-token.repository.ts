import { Db, ObjectId } from "mongodb";
import type { VerifyToken, VerifyTokenType } from "@multibotagents/types";
import type { IVerifyTokenRepository } from "../../interfaces";
import {
  VERIFY_TOKENS_COLLECTION,
  type VerifyTokenDocument,
} from "../../schemas/verify-token.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio VerifyToken. */
function toEntity(doc: VerifyTokenDocument): VerifyToken {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    type: doc.type,
    token: doc.token,
    expiresAt: doc.expiresAt,
    usedAt: doc.usedAt,
    createdAt: doc.createdAt,
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Duración de expiración por tipo de token. */
const TOKEN_EXPIRATION_MS: Record<VerifyTokenType, number> = {
  email_verification: 24 * 60 * 60 * 1000, // 24 horas
  password_reset: 60 * 60 * 1000, // 1 hora
};

// ─── Implementation ──────────────────────────────────────────────────────────

export class VerifyTokenRepository implements IVerifyTokenRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<VerifyTokenDocument>(
      VERIFY_TOKENS_COLLECTION,
    );
  }

  /**
   * Crea un token de verificación para un usuario.
   * Calcula la expiración según el tipo:
   * - email_verification: 24 horas
   * - password_reset: 1 hora
   */
  async createForUser(
    userId: string,
    type: VerifyTokenType,
    token: string,
  ): Promise<VerifyToken> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_EXPIRATION_MS[type]);

    const doc: Omit<VerifyTokenDocument, "_id"> = {
      userId: new ObjectId(userId),
      type,
      token,
      expiresAt,
      createdAt: now,
    };

    const result = await this.collection.insertOne(
      doc as VerifyTokenDocument,
    );

    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as VerifyTokenDocument);
  }

  async findById(id: string): Promise<VerifyToken | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<VerifyToken>): Promise<VerifyToken[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.userId) query.userId = new ObjectId(filter.userId);
      if (filter.type) query.type = filter.type;
      if (filter.token) query.token = filter.token;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<VerifyToken, "id">): Promise<VerifyToken> {
    const doc: Omit<VerifyTokenDocument, "_id"> = {
      userId: new ObjectId(entity.userId),
      type: entity.type,
      token: entity.token,
      expiresAt: entity.expiresAt,
      usedAt: entity.usedAt,
      createdAt: entity.createdAt,
    };

    const result = await this.collection.insertOne(
      doc as VerifyTokenDocument,
    );
    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as VerifyTokenDocument);
  }

  async update(
    id: string,
    entity: Partial<VerifyToken>,
  ): Promise<VerifyToken> {
    const { id: _id, ...updateData } = entity;
    const updateFields: Record<string, unknown> = { ...updateData };
    if (updateData.userId) {
      updateFields.userId = new ObjectId(updateData.userId);
    }
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`VerifyToken not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
