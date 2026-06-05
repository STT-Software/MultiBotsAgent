/**
 * Interfaces y tipos para la entidad Booking (Agendamiento).
 * Utilizado para definir contratos de API y tipos compartidos en la plataforma.
 */

export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";

export interface Booking {
  id: string;
  companyId: string;
  agentId: string;
  googleEventId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  dateTime: Date;
  durationMinutes: number;
  status: BookingStatus;
  notes?: string;
  rescheduleCount: number;
  createdAt: Date;
  updatedAt: Date;
}
