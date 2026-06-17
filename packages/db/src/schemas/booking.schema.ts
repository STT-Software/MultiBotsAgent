import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const BOOKINGS_COLLECTION = "bookings";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

export interface BookingDocument {
  _id: ObjectId;
  companyId: ObjectId;
  agentId: ObjectId;
  googleEventId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  dateTime: Date;
  durationMinutes: number;
  status: "confirmed" | "cancelled" | "rescheduled";
  notes?: string;
  rescheduleCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

export const BOOKINGS_INDEXES = [
  {
    key: { companyId: 1 },
    name: "companyId",
  },
  {
    key: { agentId: 1 },
    name: "agentId",
  },
  {
    key: { customerPhone: 1 },
    name: "customerPhone",
  },
  {
    key: { companyId: 1, dateTime: 1 },
    name: "companyId_dateTime",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

export const BOOKINGS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "companyId",
      "agentId",
      "googleEventId",
      "customerName",
      "customerPhone",
      "dateTime",
      "durationMinutes",
      "status",
      "rescheduleCount",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      companyId: {
        bsonType: "objectId",
        description: "ID de la empresa asociada a la reserva — requerido",
      },
      agentId: {
        bsonType: "objectId",
        description: "ID del agente que gestionó la reserva — requerido",
      },
      googleEventId: {
        bsonType: "string",
        description: "ID del evento devuelto por Google Calendar — requerido",
      },
      customerName: {
        bsonType: "string",
        minLength: 1,
        description: "Nombre del cliente — requerido",
      },
      customerPhone: {
        bsonType: "string",
        minLength: 1,
        description: "Número de teléfono del cliente — requerido",
      },
      customerEmail: {
        bsonType: "string",
        description: "Email del cliente — opcional",
      },
      dateTime: {
        bsonType: "date",
        description: "Fecha y hora de inicio de la cita — requerido",
      },
      durationMinutes: {
        bsonType: "int",
        minimum: 1,
        description: "Duración de la reserva en minutos — requerido",
      },
      status: {
        bsonType: "string",
        enum: ["confirmed", "cancelled", "rescheduled"],
        description: "Estado actual de la reserva — requerido",
      },
      notes: {
        bsonType: "string",
        description: "Notas opcionales de la reserva — opcional",
      },
      rescheduleCount: {
        bsonType: "int",
        minimum: 0,
        description: "Contador de reprogramaciones realizadas — requerido",
      },
      createdAt: {
        bsonType: "date",
        description: "Fecha de creación de la reserva en BD — requerido",
      },
      updatedAt: {
        bsonType: "date",
        description: "Fecha de última modificación — requerido",
      },
    },
  },
};
