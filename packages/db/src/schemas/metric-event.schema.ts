import { ObjectId } from "mongodb";
import type { MetricEventType } from "@multibotagents/types";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const METRIC_EVENTS_COLLECTION = "metric_events";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

export interface MetricEventDocument {
  _id: ObjectId;
  /** ID de la empresa propietaria del agente (aislamiento multi-tenant). */
  companyId: ObjectId;
  /** ID del agente que originó el evento. */
  agentId: string;
  /** Tipo de agente que originó el evento. */
  agentType: "rag" | "cotizador" | "agendamiento";
  /** Tipo de evento de negocio ocurrido. */
  eventType: MetricEventType;
  /** Momento exacto en que ocurrió el evento (provisto por el emisor). */
  timestamp: Date;
  /** Datos adicionales específicos de cada tipo de evento. */
  metadata: Record<string, unknown>;
  /** Timestamp de inserción en la base de datos. */
  createdAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

export const METRIC_EVENTS_INDEXES = [
  {
    key: { companyId: 1, timestamp: -1 },
    name: "company_timestamp",
  },
  {
    key: { agentId: 1, timestamp: -1 },
    name: "agent_timestamp",
  },
  {
    key: { companyId: 1, eventType: 1, timestamp: -1 },
    name: "company_eventType_timestamp",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

export const METRIC_EVENTS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "companyId",
      "agentId",
      "agentType",
      "eventType",
      "timestamp",
      "metadata",
      "createdAt",
    ],
    properties: {
      companyId: {
        bsonType: "objectId",
        description: "ID de la empresa propietaria — requerido",
      },
      agentId: {
        bsonType: "string",
        description: "ID del agente que originó el evento — requerido",
      },
      agentType: {
        bsonType: "string",
        enum: ["rag", "cotizador", "agendamiento"],
        description: "Tipo del agente — requerido",
      },
      eventType: {
        bsonType: "string",
        enum: [
          "conversation.completed",
          "conversation.escalated",
          "rag.no_answer",
          "rag.topic_identified",
          "order.initiated",
          "order.confirmed",
          "order.abandoned",
          "appointment.scheduled",
          "appointment.cancelled",
          "appointment.rescheduled",
          "escalation.opened",
          "escalation.resolved",
          "escalation.timeout",
        ],
        description: "Tipo de evento de negocio — requerido",
      },
      timestamp: {
        bsonType: "date",
        description: "Momento en que ocurrió el evento — requerido",
      },
      metadata: {
        bsonType: "object",
        description: "Datos adicionales del evento — requerido (puede ser vacío)",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de inserción en BD — requerido",
      },
    },
  },
};
