import { Db, ObjectId, ClientSession } from "mongodb";
import type { Order, OrderStatus, OrderItem } from "@multibotagents/types";
import type { IOrderRepository, CreateOrderData } from "../../interfaces";
import {
  ORDERS_COLLECTION,
  type OrderDocument,
} from "../../schemas/order.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio Order. */
function toEntity(doc: OrderDocument): Order {
  return {
    id: doc._id.toHexString(),
    companyId: doc.companyId.toHexString(),
    agentId: doc.agentId.toHexString(),
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    customerEmail: doc.customerEmail,
    items: doc.items.map((item: OrderItem) => ({
      nombre: item.nombre,
      precioUnitario: item.precioUnitario,
      cantidad: item.cantidad,
      subtotal: item.subtotal,
    })),
    total: doc.total,
    status: doc.status,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class OrderRepository implements IOrderRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<OrderDocument>(ORDERS_COLLECTION);
  }

  async findById(id: string): Promise<Order | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findByCompanyId(companyId: string): Promise<Order[]> {
    if (!ObjectId.isValid(companyId)) return [];
    const docs = await this.collection
      .find({ companyId: new ObjectId(companyId) })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toEntity);
  }

  async findByAgentId(agentId: string): Promise<Order[]> {
    if (!ObjectId.isValid(agentId)) return [];
    const docs = await this.collection
      .find({ agentId: new ObjectId(agentId) })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toEntity);
  }

  async findByCustomerPhone(customerPhone: string): Promise<Order[]> {
    const docs = await this.collection
      .find({ customerPhone })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toEntity);
  }

  async findActiveByCustomerPhone(customerPhone: string): Promise<Order[]> {
    const docs = await this.collection
      .find({
        customerPhone,
        status: { $in: ["pending_confirmation", "confirmed", "preparing", "shipped"] },
      })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toEntity);
  }

  async findAll(filter?: Partial<Order>): Promise<Order[]> {
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
    const docs = await this.collection.find(query).sort({ createdAt: -1 }).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<Order, "id">): Promise<Order> {
    const now = new Date();
    const doc: Omit<OrderDocument, "_id"> = {
      companyId: new ObjectId(entity.companyId),
      agentId: new ObjectId(entity.agentId),
      customerName: entity.customerName,
      customerPhone: entity.customerPhone,
      customerEmail: entity.customerEmail,
      items: entity.items.map((item: OrderItem) => ({
        nombre: item.nombre,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        subtotal: item.subtotal,
      })),
      total: entity.total,
      status: entity.status,
      notes: entity.notes,
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
    };

    const result = await this.collection.insertOne(doc as OrderDocument);
    return toEntity({ _id: result.insertedId, ...doc } as OrderDocument);
  }

  async createWithSession(data: CreateOrderData, session: ClientSession): Promise<Order> {
    const now = new Date();
    const doc: Omit<OrderDocument, "_id"> = {
      companyId: new ObjectId(data.companyId),
      agentId: new ObjectId(data.agentId),
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      items: data.items.map((item: any) => ({
        nombre: item.nombre,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        subtotal: item.subtotal,
      })),
      total: data.total,
      status: data.status,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(doc as OrderDocument, { session });
    return toEntity({ _id: result.insertedId, ...doc } as OrderDocument);
  }

  async update(id: string, entity: Partial<Order>): Promise<Order> {
    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid order ID: ${id}`);
    }

    const updateData: Record<string, unknown> = {};

    if (entity.customerName !== undefined) updateData.customerName = entity.customerName;
    if (entity.customerPhone !== undefined) updateData.customerPhone = entity.customerPhone;
    if (entity.customerEmail !== undefined) updateData.customerEmail = entity.customerEmail;
    if (entity.items !== undefined) {
      updateData.items = entity.items.map((item: OrderItem) => ({
        nombre: item.nombre,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        subtotal: item.subtotal,
      }));
    }
    if (entity.total !== undefined) updateData.total = entity.total;
    if (entity.status !== undefined) updateData.status = entity.status;
    if (entity.notes !== undefined) updateData.notes = entity.notes;

    updateData.updatedAt = new Date();

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) throw new Error(`Order not found: ${id}`);
    return toEntity(result);
  }

  async updateStatus(orderId: string, status: OrderStatus, session?: ClientSession): Promise<Order | null> {
    if (!ObjectId.isValid(orderId)) return null;

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        session,
      }
    );

    return result ? toEntity(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
