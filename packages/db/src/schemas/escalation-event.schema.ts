import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const ESCALATION_EVENTS_COLLECTION = "escalation_events";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

export interface EscalationEventDocument {
  _id: ObjectId;
  conversationId: ObjectId;
  companyId: ObjectId;
  agentId: string;
  agentName: string;
  escalationType: "explicit" | "agent_detected";
  reason: string;
  escalatedAt: Date;
  resolvedAt: Date;
  resolvedBy: string;
  durationMinutes: number;
  createdAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

export const ESCALATION_EVENTS_INDEXES = [
  {
    key: { companyId: 1, createdAt: -1 },
    name: "company_createdAt_desc",
  },
  {
    key: { companyId: 1, resolvedAt: 1 },
    name: "company_resolvedAt",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

export const ESCALATION_EVENTS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "conversationId",
      "companyId",
      "agentId",
      "agentName",
      "escalationType",
      "reason",
      "escalatedAt",
      "resolvedAt",
      "resolvedBy",
      "durationMinutes",
      "createdAt",
    ],
    properties: {
      conversationId: {
        bsonType: "objectId",
        description: "ID de la conversación escalada — requerido",
      },
      companyId: {
        bsonType: "objectId",
        description: "ID de la empresa — requerido",
      },
      agentId: {
        bsonType: "string",
        description: "ID del agente que escaló — requerido",
      },
      agentName: {
        bsonType: "string",
        description: "Nombre del agente — requerido",
      },
      escalationType: {
        bsonType: "string",
        enum: ["explicit", "agent_detected"],
        description: "Tipo de escalamiento — requerido",
      },
      reason: {
        bsonType: "string",
        description: "Motivo del escalamiento — requerido",
      },
      escalatedAt: {
        bsonType: "date",
        description: "Timestamp del escalamiento — requerido",
      },
      resolvedAt: {
        bsonType: "date",
        description: "Timestamp de resolución — requerido",
      },
      resolvedBy: {
        bsonType: "string",
        description: "ID del operador o 'system_timeout' — requerido",
      },
      durationMinutes: {
        bsonType: "number",
        description: "Duración en minutos — requerido",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
    },
  },
};
