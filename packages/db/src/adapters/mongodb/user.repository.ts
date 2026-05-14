import { ClientSession, Db, ObjectId } from "mongodb";
import type { User } from "@multibotagents/types";
import type { IUserRepository, CreateUserData } from "../../interfaces";
import {
  USERS_COLLECTION,
  type UserDocument,
} from "../../schemas/user.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio User. */
function toEntity(doc: UserDocument): User {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    emailVerified: doc.emailVerified,
    companyId: doc.companyId.toHexString(),
    activeSessionId: doc.activeSessionId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class UserRepository implements IUserRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<UserDocument>(USERS_COLLECTION);
  }

  /**
   * Busca un usuario por email de forma case-insensitive.
   * Normaliza el email a minúsculas antes de la búsqueda.
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    const doc = await this.collection.findOne(
      { email: normalizedEmail },
      { collation: { locale: "en", strength: 2 } },
    );
    return doc ? toEntity(doc) : null;
  }

  async createWithSession(
    data: CreateUserData,
    session: ClientSession,
  ): Promise<User> {
    const now = new Date();
    const doc: Omit<UserDocument, "_id"> = {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      emailVerified: false,
      companyId: new ObjectId(data.companyId),
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(
      doc as UserDocument,
      { session },
    );

    return toEntity({ _id: result.insertedId, ...doc } as UserDocument);
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.email) query.email = filter.email.toLowerCase();
      if (filter.companyId) query.companyId = new ObjectId(filter.companyId);
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<User, "id">): Promise<User> {
    const doc: Omit<UserDocument, "_id"> = {
      email: entity.email.toLowerCase(),
      passwordHash: entity.passwordHash,
      emailVerified: entity.emailVerified,
      companyId: new ObjectId(entity.companyId),
      activeSessionId: entity.activeSessionId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    const result = await this.collection.insertOne(doc as UserDocument);
    return toEntity({ _id: result.insertedId, ...doc } as UserDocument);
  }

  async update(id: string, entity: Partial<User>): Promise<User> {
    const { id: _id, ...updateData } = entity;
    const updateFields: Record<string, unknown> = { ...updateData, updatedAt: new Date() };
    if (updateData.companyId) {
      updateFields.companyId = new ObjectId(updateData.companyId);
    }
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`User not found: ${id}`);
    return toEntity(result);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { emailVerified: true, updatedAt: new Date() } },
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
