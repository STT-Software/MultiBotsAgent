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
export * from "./interfaces/rag-engine.interfaces";
export * from "./interfaces/rag-engine-io.interfaces";

// Enums
export * from "./enums/example.enum";
export * from "./enums/rag-engine.enums";

// Auth — Registro, login, cambio de contraseña y validación
export * from "./auth";

// Email Verification
export * from "./email-verification";

// Company Profile
export * from "./company-profile";

// Knowledge Base
export * from "./knowledge";
// WhatsApp — Webhook verification y tipos del conector
export * from "./whatsapp";

// Telegram — Tipos para la mensajería del bot
export * from "./telegram";

// Conversational Memory
export * from "./memory";

// Agents
export * from "./agents/agent.types";

// Bookings
export * from "./interfaces/booking.interface";
