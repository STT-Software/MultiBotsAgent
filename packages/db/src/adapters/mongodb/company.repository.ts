import { ClientSession, Db, ObjectId } from "mongodb";
import type { Company, CompanyStatus } from "@multibotagents/types";
import type { ICompanyRepository, CreateCompanyData } from "../../interfaces";
import {
  COMPANIES_COLLECTION,
  type CompanyDocument,
} from "../../schemas/company.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio Company. */
function toEntity(doc: CompanyDocument): Company {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    country: doc.country,
    category: doc.category,
    size: doc.size,
    phone: doc.phone,
    logo: doc.logo,
    referralSource: doc.referralSource,
    status: doc.status,
    deletionReqDate: doc.deletionReqDate,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class CompanyRepository implements ICompanyRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<CompanyDocument>(COMPANIES_COLLECTION);
  }

  async createWithSession(
    data: CreateCompanyData,
    session: ClientSession,
  ): Promise<Company> {
    const now = new Date();
    const doc: Omit<CompanyDocument, "_id"> = {
      name: data.name,
      country: data.country,
      category: data.category as CompanyDocument["category"],
      size: data.size as CompanyDocument["size"],
      phone: data.phone,
      referralSource: data.referralSource as CompanyDocument["referralSource"],
      status: "active" as CompanyStatus,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(
      doc as CompanyDocument,
      { session },
    );

    return toEntity({ _id: result.insertedId, ...doc } as CompanyDocument);
  }

  async findById(id: string): Promise<Company | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<Company>): Promise<Company[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.name) query.name = filter.name;
      if (filter.status) query.status = filter.status;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<Company, "id">): Promise<Company> {
    const doc: Omit<CompanyDocument, "_id"> = {
      name: entity.name,
      country: entity.country,
      category: entity.category,
      size: entity.size,
      phone: entity.phone,
      logo: entity.logo,
      referralSource: entity.referralSource,
      status: entity.status,
      deletionReqDate: entity.deletionReqDate,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    const result = await this.collection.insertOne(doc as CompanyDocument);
    return toEntity({ _id: result.insertedId, ...doc } as CompanyDocument);
  }

  async update(id: string, entity: Partial<Company>): Promise<Company> {
    const { id: _id, ...updateData } = entity;
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`Company not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
