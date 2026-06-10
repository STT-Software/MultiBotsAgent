/**
 * Interfaces y tipos para la entidad Order (Pedido / Cotización).
 * Utilizado para definir contratos de API y tipos compartidos en la plataforma.
 */

export type OrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Order {
  id: string;
  companyId: string;
  agentId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
