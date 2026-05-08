import { ClientSession, Db, ObjectId } from "mongodb";
import type { RefreshToken } from "@multibotagents/types";
import type { Repository } from "../../interfaces/repository.interface";
import {
  REFRESH_TOKENS_COLLECTION,
  type RefreshTokenDocument,
} from "../../schemas/refresh-token.schema";

// ─── DTOs ────────────────────────────────────────────────────────────────────

/** Datos necesarios para crear un refresh token dentro de una transacción. */
export interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
}

// ─── Repository Interface ────────────────────────────────────────────────────

export interface IRefreshTokenRepository extends Repository<RefreshToken> {
  createWithSession(
    data: CreateRefreshTokenData,
    session: ClientSession,
  ): Promise<RefreshToken>;
  revokeAllByUserId(userId: string, session: ClientSession): Promise<void>;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio RefreshToken. */
function toEntity(doc: RefreshTokenDocument): RefreshToken {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    token: doc.token,
    expiresAt: doc.expiresAt,
    revoked: doc.revoked,
    createdAt: doc.createdAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class RefreshTokenRepository implements IRefreshTokenRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<RefreshTokenDocument>(
      REFRESH_TOKENS_COLLECTION,
    );
  }

  async createWithSession(
    data: CreateRefreshTokenData,
    session: ClientSession,
  ): Promise<RefreshToken> {
    const now = new Date();
    const doc: Omit<RefreshTokenDocument, "_id"> = {
      userId: new ObjectId(data.userId),
      token: data.token,
      expiresAt: data.expiresAt,
      revoked: false,
      createdAt: now,
    };

    const result = await this.collection.insertOne(
      doc as RefreshTokenDocument,
      { session },
    );

    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as RefreshTokenDocument);
  }

  /**
   * Revoca todos los refresh tokens activos de un usuario.
   * Usa updateMany para marcar todos como revoked = true.
   * Se ejecuta dentro de una transacción para garantizar atomicidad.
   */
  async revokeAllByUserId(
    userId: string,
    session: ClientSession,
  ): Promise<void> {
    await this.collection.updateMany(
      { userId: new ObjectId(userId), revoked: false },
      { $set: { revoked: true } },
      { session },
    );
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<RefreshToken>): Promise<RefreshToken[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.userId) query.userId = new ObjectId(filter.userId);
      if (filter.token) query.token = filter.token;
      if (filter.revoked !== undefined) query.revoked = filter.revoked;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<RefreshToken, "id">): Promise<RefreshToken> {
    const doc: Omit<RefreshTokenDocument, "_id"> = {
      userId: new ObjectId(entity.userId),
      token: entity.token,
      expiresAt: entity.expiresAt,
      revoked: entity.revoked,
      createdAt: entity.createdAt,
    };

    const result = await this.collection.insertOne(
      doc as RefreshTokenDocument,
    );
    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as RefreshTokenDocument);
  }

  async update(
    id: string,
    entity: Partial<RefreshToken>,
  ): Promise<RefreshToken> {
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
    if (!result) throw new Error(`RefreshToken not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
