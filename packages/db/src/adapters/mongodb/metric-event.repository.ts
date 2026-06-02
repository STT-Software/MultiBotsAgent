import { Db, ObjectId } from "mongodb";
import {
  METRIC_EVENTS_COLLECTION,
  METRIC_EVENTS_INDEXES,
  type MetricEventDocument,
} from "../../schemas/metric-event.schema";
import type { IMetricEventRepository } from "../../interfaces/repositories.interface";
import type { MetricEventPayload } from "@multibotagents/types";

// ─── Implementation ──────────────────────────────────────────────────────────

export class MetricEventRepository implements IMetricEventRepository {
  private readonly collection;

  constructor(db: Db) {
    this.collection = db.collection<MetricEventDocument>(METRIC_EVENTS_COLLECTION);
  }

  /**
   * Crea los índices definidos en METRIC_EVENTS_INDEXES.
   * Debe llamarse durante la inicialización de la app / migrations,
   * antes de insertar cualquier dato.
   */
  async ensureIndexes(): Promise<void> {
    for (const index of METRIC_EVENTS_INDEXES) {
      await this.collection.createIndex(index.key, { name: index.name });
    }
  }

  /**
   * Inserta un único evento de métrica.
   * Convierte companyId a ObjectId y agrega createdAt automáticamente.
   */
  async create(payload: Omit<MetricEventDocument, "_id">): Promise<MetricEventDocument> {
    const doc: Omit<MetricEventDocument, "_id"> = {
      ...payload,
      companyId: typeof payload.companyId === "string"
        ? new ObjectId(payload.companyId as unknown as string)
        : payload.companyId,
      createdAt: new Date(),
    };

    const result = await this.collection.insertOne(doc as MetricEventDocument);
    return { _id: result.insertedId, ...doc } as MetricEventDocument;
  }

  /**
   * Inserta múltiples eventos en un solo batch.
   * Convierte companyId a ObjectId y agrega createdAt en cada documento.
   */
  async insertMany(payloads: Omit<MetricEventDocument, "_id">[]): Promise<void> {
    if (payloads.length === 0) return;

    const now = new Date();
    const docs = payloads.map((payload) => ({
      ...payload,
      companyId: typeof payload.companyId === "string"
        ? new ObjectId(payload.companyId as unknown as string)
        : payload.companyId,
      createdAt: now,
    })) as MetricEventDocument[];

    await this.collection.insertMany(docs);
  }

  /**
   * Cuenta los eventos de una empresa.
   * Usado para verificar si ya existe seed data antes de insertar duplicados.
   */
  async countByCompany(companyId: string): Promise<number> {
    return this.collection.countDocuments({
      companyId: new ObjectId(companyId),
    });
  }
}

// ─── Helper: build document from MetricEventPayload ─────────────────────────

/**
 * Convierte un MetricEventPayload (emitido por los módulos)
 * al formato de documento MongoDB esperado por el repositorio.
 */
export function buildMetricEventDocument(
  payload: MetricEventPayload
): Omit<MetricEventDocument, "_id"> {
  return {
    companyId: new ObjectId(payload.companyId),
    agentId: payload.agentId,
    agentType: payload.agentType,
    eventType: payload.eventType,
    timestamp: payload.timestamp,
    metadata: payload.metadata ?? {},
    createdAt: new Date(),
  };
}
