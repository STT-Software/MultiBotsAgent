import { type ClientSession, Db, ObjectId } from "mongodb";
import {
  type EmailQueueItem,
  EmailQueueStatus,
} from "@multibotagents/types";
import type { IEmailQueueRepository, EnqueueEmailData } from "../../interfaces";
import {
  EMAIL_QUEUE_COLLECTION,
  type EmailQueueDocument,
} from "../../schemas/email-queue.schema";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Convierte un documento MongoDB a la entidad de dominio EmailQueueItem. */
function toEntity(doc: EmailQueueDocument): EmailQueueItem {
  return {
    id: doc._id.toHexString(),
    to: doc.to,
    template: doc.template,
    payload: doc.payload,
    status: doc.status,
    attempts: doc.attempts,
    nextRetryAt: doc.nextRetryAt,
    lastError: doc.lastError,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class EmailQueueRepository implements IEmailQueueRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<EmailQueueDocument>(
      EMAIL_QUEUE_COLLECTION,
    );
  }

  /**
   * Encola un email para envío.
   * Establece valores por defecto: status='pending', attempts=0, timestamps=now.
   */
  async enqueue(item: EnqueueEmailData): Promise<EmailQueueItem> {
    const now = new Date();
    const doc: Omit<EmailQueueDocument, "_id"> = {
      to: item.to,
      template: item.template,
      payload: item.payload,
      status: EmailQueueStatus.PENDING as EmailQueueDocument["status"],
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(
      doc as EmailQueueDocument,
    );

    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as EmailQueueDocument);
  }

  /**
   * Encola un email para envío dentro de una transacción MongoDB.
   * Misma lógica que enqueue pero con soporte de sesión.
   */
  async enqueueWithSession(item: EnqueueEmailData, session: ClientSession): Promise<EmailQueueItem> {
    const now = new Date();
    const doc: Omit<EmailQueueDocument, "_id"> = {
      to: item.to,
      template: item.template,
      payload: item.payload,
      status: EmailQueueStatus.PENDING as EmailQueueDocument["status"],
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(
      doc as EmailQueueDocument,
      { session },
    );

    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as EmailQueueDocument);
  }

  /**
   * Obtiene documentos elegibles para procesamiento.
   * Elegibles: status 'pending' O status 'failed' con nextRetryAt <= now.
   * Ordenados por createdAt ascendente (FIFO).
   */
  async findEligible(limit: number): Promise<EmailQueueItem[]> {
    const now = new Date();

    const docs = await this.collection
      .find({
        $or: [
          { status: EmailQueueStatus.PENDING },
          {
            status: EmailQueueStatus.FAILED,
            nextRetryAt: { $lte: now },
          },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();

    return docs.map(toEntity);
  }

  /**
   * Toma un documento para procesamiento con lock atómico.
   * Usa findOneAndUpdate con filtro del status original para evitar
   * procesamiento concurrente (solo una invocación obtiene el documento).
   */
  async takeForProcessing(
    id: string,
    currentStatus: string,
  ): Promise<EmailQueueItem | null> {
    const now = new Date();

    const doc = await this.collection.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        status: currentStatus as EmailQueueStatus,
      },
      {
        $set: {
          status: EmailQueueStatus.PROCESSING,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );

    return doc ? toEntity(doc) : null;
  }

  /**
   * Marca un documento como enviado exitosamente.
   * Actualiza status a 'sent' y el timestamp.
   */
  async markSent(id: string): Promise<void> {
    const now = new Date();

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: EmailQueueStatus.SENT,
          updatedAt: now,
        },
      },
    );
  }

  /**
   * Marca un documento como fallido con información de retry.
   * Actualiza status, lastError, nextRetryAt y attempts.
   */
  async markFailed(
    id: string,
    error: string,
    nextRetryAt: Date | null,
    attempts: number,
  ): Promise<void> {
    const now = new Date();

    const updateFields: Record<string, unknown> = {
      status: EmailQueueStatus.FAILED,
      lastError: error,
      attempts,
      updatedAt: now,
    };

    if (nextRetryAt) {
      updateFields.nextRetryAt = nextRetryAt;
    } else {
      updateFields.nextRetryAt = undefined;
    }

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields },
    );
  }

  /**
   * Cuenta documentos por status.
   */
  async countByStatus(status: string): Promise<number> {
    return this.collection.countDocuments({ status: status as EmailQueueStatus });
  }

  /**
   * Calcula tiempo promedio en cola de documentos pendientes (en ms).
   * Usa aggregation pipeline para calcular la diferencia entre now y createdAt.
   * Retorna 0 si no hay documentos pendientes.
   */
  async avgQueueTime(): Promise<number> {
    const now = new Date();

    const result = await this.collection
      .aggregate<{ avgMs: number }>([
        { $match: { status: EmailQueueStatus.PENDING } },
        {
          $group: {
            _id: null,
            avgMs: {
              $avg: { $subtract: [now, "$createdAt"] },
            },
          },
        },
      ])
      .toArray();

    return result.length > 0 ? result[0].avgMs : 0;
  }

  /**
   * Resetea documentos stuck en estado 'processing' por más de timeoutMs.
   * Los devuelve a estado 'pending' para que sean reprocesados.
   */
  async resetStuckDocuments(timeoutMs: number): Promise<void> {
    const cutoff = new Date(Date.now() - timeoutMs);

    await this.collection.updateMany(
      {
        status: EmailQueueStatus.PROCESSING,
        updatedAt: { $lte: cutoff },
      },
      {
        $set: {
          status: EmailQueueStatus.PENDING,
          updatedAt: new Date(),
        },
      },
    );
  }

  // ─── Base Repository Methods ─────────────────────────────────────────────────

  async findById(id: string): Promise<EmailQueueItem | null> {
    const doc = await this.collection.findOne({ _id: new ObjectId(id) });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filter?: Partial<EmailQueueItem>): Promise<EmailQueueItem[]> {
    const query: Record<string, unknown> = {};
    if (filter) {
      if (filter.id) query._id = new ObjectId(filter.id);
      if (filter.status) query.status = filter.status;
      if (filter.template) query.template = filter.template;
      if (filter.to) query.to = filter.to;
    }
    const docs = await this.collection.find(query).toArray();
    return docs.map(toEntity);
  }

  async create(entity: Omit<EmailQueueItem, "id">): Promise<EmailQueueItem> {
    const doc: Omit<EmailQueueDocument, "_id"> = {
      to: entity.to,
      template: entity.template,
      payload: entity.payload,
      status: entity.status,
      attempts: entity.attempts,
      nextRetryAt: entity.nextRetryAt,
      lastError: entity.lastError,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    const result = await this.collection.insertOne(
      doc as EmailQueueDocument,
    );
    return toEntity({
      _id: result.insertedId,
      ...doc,
    } as EmailQueueDocument);
  }

  async update(
    id: string,
    entity: Partial<EmailQueueItem>,
  ): Promise<EmailQueueItem> {
    const { id: _id, ...updateData } = entity;
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`EmailQueueItem not found: ${id}`);
    return toEntity(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
