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
// NOTA: rag-engine.dto usa class-validator/class-transformer (decoradores con reflect-metadata)
// Se exporta desde sub-path "@multibotagents/types/rag-engine-dto" para evitar contaminar el frontend.
// export * from "./dtos/rag-engine.dto";

// Interfaces
export * from "./interfaces/example.interface";
export * from "./interfaces/rag-engine-io.interfaces";
export * from "./interfaces/rag-engine.interfaces";

// Enums
export * from "./enums/example.enum";
export * from "./enums/rag-engine.enums";

// Auth — Registro de empresa y usuario
export * from "./auth/register.types";
export * from "./auth/errors.types";
