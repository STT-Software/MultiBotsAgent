import { ObjectId } from "mongodb";

// ─── Collection Name ─────────────────────────────────────────────────────────

export const ORDERS_COLLECTION = "orders";

// ─── MongoDB Document Interface ──────────────────────────────────────────────

export interface OrderItemDocument {
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface OrderDocument {
  _id: ObjectId;
  companyId: ObjectId;
  agentId: ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: OrderItemDocument[];
  total: number;
  status: "pending_confirmation" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Index Definitions ───────────────────────────────────────────────────────

export const ORDERS_INDEXES = [
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
    key: { companyId: 1, status: 1 },
    name: "companyId_status",
  },
  {
    key: { createdAt: -1 },
    name: "createdAt_desc",
  },
] as const;

// ─── JSON Schema Validation ──────────────────────────────────────────────────

export const ORDERS_VALIDATION = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "companyId",
      "agentId",
      "customerName",
      "customerPhone",
      "customerEmail",
      "items",
      "total",
      "status",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      companyId: {
        bsonType: "objectId",
        description: "ID de la empresa asociada a la orden — requerido",
      },
      agentId: {
        bsonType: "objectId",
        description: "ID del agente que gestionó la orden — requerido",
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
        description: "Email del cliente — requerido",
      },
      items: {
        bsonType: "array",
        description: "Items del pedido — requerido",
        items: {
          bsonType: "object",
          required: ["nombre", "precioUnitario", "cantidad", "subtotal"],
          properties: {
            nombre: {
              bsonType: "string",
              description: "Nombre del producto — requerido",
            },
            precioUnitario: {
              bsonType: ["double", "int"],
              description: "Precio unitario del producto — requerido",
            },
            cantidad: {
              bsonType: "int",
              minimum: 1,
              description: "Cantidad de unidades del producto — requerido",
            },
            subtotal: {
              bsonType: ["double", "int"],
              description: "Subtotal calculado del ítem — requerido",
            },
          },
        },
      },
      total: {
        bsonType: ["double", "int"],
        description: "Total calculado de la orden — requerido",
      },
      status: {
        bsonType: "string",
        enum: ["pending_confirmation", "confirmed", "preparing", "shipped", "delivered", "cancelled"],
        description: "Estado actual del pedido — requerido",
      },
      notes: {
        bsonType: "string",
        description: "Notas opcionales del pedido — opcional",
      },
      createdAt: {
        bsonType: "date",
        description: "Fecha de creación del pedido en BD — requerido",
      },
      updatedAt: {
        bsonType: "date",
        description: "Fecha de última modificación — requerido",
      },
    },
  },
};
