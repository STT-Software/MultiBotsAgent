/**
 * @multibotagents/types
 *
 * Paquete de tipos compartidos entre frontend y backend.
 * Exporta DTOs, interfaces y enums que son consumidos por múltiples apps.
 *
 * Regla: si un tipo lo usa más de una app → va aquí.
 *        Si solo lo usa una app → va local en esa app.
 */

// DTOs
export * from "./dtos/example.dto";

// Interfaces
export * from "./interfaces/example.interface";

// Enums
export * from "./enums/example.enum";

// Auth — Registro de empresa y usuario
export * from "./auth/register.types";
export * from "./auth/errors.types";
