import { Db, ObjectId } from "mongodb";
import {
  METRIC_EVENTS_COLLECTION,
  METRIC_EVENTS_INDEXES,
  type MetricEventDocument,
} from "../../schemas/metric-event.schema";
import type { IMetricEventRepository } from "../../interfaces/repositories.interface";
import type { MetricEventPayload, MetricEventType } from "@multibotagents/types";

// ─── Agent Filter Types (Slice 3 — Métricas por Agente) ─────────────────────

export type AgentType = 'rag' | 'cotizador' | 'agendamiento';

export type AgentFilter =
  | { type: 'byId';   agentId: string }
  | { type: 'byType'; agentType: AgentType };

function buildAgentMatch(filter: AgentFilter): Record<string, unknown> {
  return filter.type === 'byId'
    ? { agentId: filter.agentId }
    : { agentType: filter.agentType };
}

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

  // ─── Métodos de Agregación (Slice 2 — Consulta de Métricas Generales) ───────

  /**
   * Cuenta documentos que coincidan con uno o más eventTypes dentro de un período.
   * Usa el índice { companyId, eventType, timestamp }.
   */
  async countByEventTypes(
    companyId: ObjectId,
    eventTypes: MetricEventType[],
    since: Date,
  ): Promise<number> {
    const result = await this.collection
      .aggregate<{ count: number }>([
        {
          $match: {
            companyId,
            eventType: { $in: eventTypes },
            timestamp: { $gte: since },
          },
        },
        { $count: "count" },
      ])
      .toArray();

    return result[0]?.count ?? 0;
  }

  /**
   * Cuenta documentos de un eventType específico que además tengan
   * un campo de metadata con un valor concreto.
   * Ej: conversation.completed donde metadata.resolved === true
   */
  async countByEventTypeAndMeta(
    companyId: ObjectId,
    eventType: MetricEventType,
    metaKey: string,
    metaValue: unknown,
    since: Date,
  ): Promise<number> {
    const result = await this.collection
      .aggregate<{ count: number }>([
        {
          $match: {
            companyId,
            eventType,
            timestamp: { $gte: since },
            [`metadata.${metaKey}`]: metaValue,
          },
        },
        { $count: "count" },
      ])
      .toArray();

    return result[0]?.count ?? 0;
  }

  /**
   * Agrega los valores más frecuentes de un campo de metadata para un eventType dado.
   * Ej: top 10 de metadata.topic en eventos rag.topic_identified
   */
  async topValuesByMetaField(
    companyId: ObjectId,
    eventType: MetricEventType,
    metaField: string,
    limit: number,
    since: Date,
  ): Promise<{ value: string; count: number }[]> {
    const result = await this.collection
      .aggregate<{ value: string; count: number }>([
        {
          $match: {
            companyId,
            eventType,
            timestamp: { $gte: since },
          },
        },
        {
          $group: {
            _id: `$metadata.${metaField}`,
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            value: "$_id",
            count: 1,
          },
        },
      ])
      .toArray();

    return result;
  }

  /**
   * Calcula el promedio de un campo numérico de metadata para un eventType dado.
   * Ej: promedio de metadata.durationMinutes en eventos escalation.resolved
   * Retorna 0 si no hay documentos o el campo no existe.
   */
  async avgMetaNumberField(
    companyId: ObjectId,
    eventType: MetricEventType,
    metaField: string,
    since: Date,
  ): Promise<number> {
    const result = await this.collection
      .aggregate<{ avg: number | null }>([
        {
          $match: {
            companyId,
            eventType,
            timestamp: { $gte: since },
          },
        },
        {
          $group: {
            _id: null,
            avg: { $avg: `$metadata.${metaField}` },
          },
        },
      ])
      .toArray();

    const avg = result[0]?.avg;
    return avg != null && !Number.isNaN(avg) ? avg : 0;
  }

  // ─── Agregaciones por Agente (Slice 3 — Métricas por Tipo de Agente) ────────

  /**
   * Cuenta eventos filtrando por empresa, agente (id o tipo) y eventTypes.
   */
  async countByAgentAndEventTypes(
    companyId: ObjectId,
    agentFilter: AgentFilter,
    eventTypes: MetricEventType[],
    since: Date,
  ): Promise<number> {
    const result = await this.collection
      .aggregate<{ count: number }>([
        {
          $match: {
            companyId,
            ...buildAgentMatch(agentFilter),
            eventType: { $in: eventTypes },
            timestamp: { $gte: since },
          },
        },
        { $count: 'count' },
      ])
      .toArray();

    return result[0]?.count ?? 0;
  }

  /**
   * Cuenta eventos filtrando por empresa, agente, un eventType y un campo de metadata.
   */
  async countByAgentEventTypeAndMeta(
    companyId: ObjectId,
    agentFilter: AgentFilter,
    eventType: MetricEventType,
    metaKey: string,
    metaValue: unknown,
    since: Date,
  ): Promise<number> {
    const result = await this.collection
      .aggregate<{ count: number }>([
        {
          $match: {
            companyId,
            ...buildAgentMatch(agentFilter),
            eventType,
            timestamp: { $gte: since },
            [`metadata.${metaKey}`]: metaValue,
          },
        },
        { $count: 'count' },
      ])
      .toArray();

    return result[0]?.count ?? 0;
  }

  /**
   * Top N valores de un campo de metadata, filtrado por agente.
   * Ej: top temas RAG de un agente específico.
   */
  async topAgentValuesByMetaField(
    companyId: ObjectId,
    agentFilter: AgentFilter,
    eventType: MetricEventType,
    metaField: string,
    limit: number,
    since: Date,
  ): Promise<{ value: string; count: number }[]> {
    return this.collection
      .aggregate<{ value: string; count: number }>([
        {
          $match: {
            companyId,
            ...buildAgentMatch(agentFilter),
            eventType,
            timestamp: { $gte: since },
          },
        },
        { $group: { _id: `$metadata.${metaField}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { _id: 0, value: '$_id', count: 1 } },
      ])
      .toArray();
  }

  /**
   * Top N valores desanidando un campo array de metadata.
   * Ej: top productos de order.initiated donde metadata.productIds es un array.
   */
  async topAgentValuesByArrayMetaField(
    companyId: ObjectId,
    agentFilter: AgentFilter,
    eventType: MetricEventType,
    arrayMetaField: string,
    limit: number,
    since: Date,
  ): Promise<{ value: string; count: number }[]> {
    return this.collection
      .aggregate<{ value: string; count: number }>([
        {
          $match: {
            companyId,
            ...buildAgentMatch(agentFilter),
            eventType,
            timestamp: { $gte: since },
          },
        },
        { $unwind: `$metadata.${arrayMetaField}` },
        { $group: { _id: `$metadata.${arrayMetaField}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { _id: 0, value: '$_id', count: 1 } },
      ])
      .toArray();
  }

  /**
   * Distribución de eventos por hora del día extrayendo la hora de un campo fecha en metadata.
   * Ej: horarios pico de appointment.scheduled usando metadata.scheduledAt.
   * Retorna solo horas con count > 0.
   */
  async distributionByMetaHour(
    companyId: ObjectId,
    agentFilter: AgentFilter,
    eventType: MetricEventType,
    dateMetaField: string,
    since: Date,
  ): Promise<{ hour: number; count: number }[]> {
    return this.collection
      .aggregate<{ hour: number; count: number }>([
        {
          $match: {
            companyId,
            ...buildAgentMatch(agentFilter),
            eventType,
            timestamp: { $gte: since },
          },
        },
        {
          $addFields: {
            __hour: { $hour: { $toDate: `$metadata.${dateMetaField}` } },
          },
        },
        { $group: { _id: '$__hour', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, hour: '$_id', count: 1 } },
      ])
      .toArray();
  }

  /**
   * Obtiene los eventos más recientes de una empresa ordenados por timestamp desc.
   */
  async findRecent(
    companyId: ObjectId,
    limit: number,
  ): Promise<MetricEventDocument[]> {
    return this.collection
      .find({ companyId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
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
