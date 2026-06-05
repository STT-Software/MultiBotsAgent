/**
 * Tokens de inyección para el módulo Bookings.
 * Siguen las pautas de inyección por interfaces (AGENTS.md).
 */

/** Token para inyectar el repositorio de reservas (bookings) */
export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

/** Token para inyectar el proveedor de servicios de Google Calendar */
export const GOOGLE_CALENDAR_PROVIDER = Symbol('GOOGLE_CALENDAR_PROVIDER');
