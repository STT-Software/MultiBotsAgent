import { Db, ObjectId } from "mongodb";
import type { Booking } from "@multibotagents/types";
import type { IBookingRepository } from "../../interfaces";
import {
  BOOKINGS_COLLECTION,
  type BookingDocument,
} from "../../schemas/booking.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio Booking. */
function toEntity(doc: BookingDocument): Booking {
  return {
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    agentId: doc.agentId.toHexString(),
    googleEventId: doc.googleEventId,
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    customerEmail: doc.customerEmail,
    dateTime: doc.dateTime,
    durationMinutes: doc.durationMinutes,
    status: doc.status,
    notes: doc.notes,
    rescheduleCount: doc.rescheduleCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class BookingRepository implements IBookingRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<BookingDocument>(BOOKINGS_COLLECTION);
  }

  async findById(id: string): Promise<Booking | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findByCompanyId(companyId: string): Promise<Booking[]> {
    if (!ObjectId.isValid(companyId)) return [];
    const docs = await this.collection
      .find({ companyId: new ObjectId(companyId) })
      .sort({ dateTime: 1 })
      .toArray();
    return docs.map(toEntity);
  }

  async findByAgentId(agentId: string): Promise<Booking[]> {
    if (!ObjectId.isValid(agentId)) return [];
    const docs = await this.collection
      .find({ agentId: new ObjectId(agentId) })
      .sort({ dateTime: 1 })
      .toArray();
    return docs.map(toEntity);
  }

  async findByCustomerPhone(customerPhone: string): Promise<Booking[]> {
    const docs = await this.collection
      .find({ customerPhone })
      .sort({ dateTime: -1 })
      .toArray();
    return docs.map(toEntity);
  }

  async findActiveByCustomerPhone(customerPhone: string): Promise<Booking[]> {
    const docs = await this.collection
      .find({
        customerPhone,
        status: { $in: ["confirmed", "rescheduled"] },
      })
      .sort({ dateTime: -1 })
      .toArray();
    return docs.map(toEntity);
  }

  async findByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<Booking[]> {
    if (!ObjectId.isValid(companyId)) return [];
    const docs = await this.collection
      .find({
        companyId: new ObjectId(companyId),
        dateTime: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ dateTime: 1 })
      .toArray();
    return docs.map(toEntity);
  }

  async findAll(filter?: Partial<Booking>): Promise<Booking[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id && ObjectId.isValid(filter.id)) {
        query._id = new ObjectId(filter.id);
      }
      if (filter.companyId && ObjectId.isValid(filter.companyId)) {
        query.companyId = new ObjectId(filter.companyId);
      }
      if (filter.agentId && ObjectId.isValid(filter.agentId)) {
        query.agentId = new ObjectId(filter.agentId);
      }
      if (filter.customerPhone) {
        query.customerPhone = filter.customerPhone;
      }
      if (filter.status) {
        query.status = filter.status;
      }
    }
    const docs = await this.collection.find(query).sort({ dateTime: 1 }).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<Booking, "id">): Promise<Booking> {
    const now = new Date();
    const doc: Omit<BookingDocument, "_id"> = {
      companyId: new ObjectId(entity.companyId),
      agentId: new ObjectId(entity.agentId),
      googleEventId: entity.googleEventId,
      customerName: entity.customerName,
      customerPhone: entity.customerPhone,
      customerEmail: entity.customerEmail,
      dateTime: entity.dateTime,
      durationMinutes: entity.durationMinutes,
      status: entity.status,
      notes: entity.notes,
      rescheduleCount: entity.rescheduleCount ?? 0,
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
    };

    const result = await this.collection.insertOne(doc as BookingDocument);
    return toEntity({ _id: result.insertedId, ...doc } as BookingDocument);
  }

  async update(id: string, entity: Partial<Booking>): Promise<Booking> {
    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid booking ID: ${id}`);
    }

    const updateData: Record<string, unknown> = {};

    if (entity.googleEventId !== undefined) updateData.googleEventId = entity.googleEventId;
    if (entity.customerName !== undefined) updateData.customerName = entity.customerName;
    if (entity.customerPhone !== undefined) updateData.customerPhone = entity.customerPhone;
    if (entity.customerEmail !== undefined) updateData.customerEmail = entity.customerEmail;
    if (entity.dateTime !== undefined) updateData.dateTime = entity.dateTime;
    if (entity.durationMinutes !== undefined) updateData.durationMinutes = entity.durationMinutes;
    if (entity.status !== undefined) updateData.status = entity.status;
    if (entity.notes !== undefined) updateData.notes = entity.notes;
    if (entity.rescheduleCount !== undefined) updateData.rescheduleCount = entity.rescheduleCount;

    updateData.updatedAt = new Date();

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) throw new Error(`Booking not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
