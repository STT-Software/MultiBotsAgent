import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const ESCALATED_CONVERSATIONS_COLLECTION = "escalated_conversations";

// ─── MongoDB Document Interfaces ─────────────────────────────────────────────

export interface EscalatedConversationMessageDocument {
  _id: ObjectId;
  sender: "user" | "agent" | "operator";
  content: string;
  timestamp: Date;
  type: "text" | "image" | "file";
  status?: "sending" | "sent" | "pending" | "failed";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
}

export interface EscalatedConversationDocument {
  _id: ObjectId;
  companyId: ObjectId;
  userId: string;
  userAvatar?: string;
  agentId: string;
  agentName: string;
  agentType: "rag" | "cotizador" | "agendamiento";
  status: "escalated" | "resolved" | "unassigned" | "active";
  escalationType: "explicit" | "agent_detected";
  escalatedAt: Date;
  resolvedAt?: Date;
  reason: string;
  messages: EscalatedConversationMessageDocument[];
  isSeeded?: boolean;
  hadEscalation?: boolean;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

export const ESCALATED_CONVERSATIONS_INDEXES = [
  {
    key: { companyId: 1, status: 1, escalatedAt: 1 },
    name: "company_status_escalatedAt",
  },
  {
    key: { companyId: 1, escalatedAt: -1 },
    name: "company_escalatedAt_desc",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

export const ESCALATED_CONVERSATIONS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "companyId",
      "userId",
      "agentId",
      "agentName",
      "agentType",
      "status",
      "escalationType",
      "escalatedAt",
      "reason",
      "messages",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      companyId: {
        bsonType: "objectId",
        description: "ID de la empresa — requerido",
      },
      userId: {
        bsonType: "string",
        description: "Nombre o número del usuario final — requerido",
      },
      userAvatar: {
        bsonType: "string",
        description: "URL del avatar del usuario — opcional",
      },
      agentId: {
        bsonType: "string",
        description: "ID del agente que escaló — requerido",
      },
      agentName: {
        bsonType: "string",
        description: "Nombre del agente — requerido",
      },
      agentType: {
        bsonType: "string",
        enum: ["rag", "cotizador", "agendamiento"],
        description: "Tipo del agente — requerido",
      },
      status: {
        bsonType: "string",
        enum: ["escalated", "resolved", "unassigned", "active"],
        description: "Estado de la conversación — requerido",
      },
      escalationType: {
        bsonType: "string",
        enum: ["explicit", "agent_detected"],
        description: "Tipo de escalamiento — requerido",
      },
      escalatedAt: {
        bsonType: "date",
        description: "Timestamp del escalamiento — requerido",
      },
      resolvedAt: {
        bsonType: "date",
        description: "Timestamp de resolución — opcional",
      },
      reason: {
        bsonType: "string",
        description: "Motivo del escalamiento — requerido",
      },
      messages: {
        bsonType: "array",
        description: "Historial de mensajes — requerido",
      },
      isSeeded: {
        bsonType: "bool",
        description: "Marca de datos de seed — opcional",
      },
      createdAt: {
        bsonType: "date",
        description: "Timestamp de creación — requerido",
      },
      updatedAt: {
        bsonType: "date",
        description: "Timestamp de última actualización — requerido",
      },
    },
  },
};
