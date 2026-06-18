/**
 * Barrel del dominio de Integraciones Externas (SL13) en `@multibotagents/core`.
 * Lógica pura: servicios, puertos y errores. Sin dependencias de AWS/NestJS.
 */

export * from "./oauth-state.service";
export * from "./ports/oauth-state-store.interface";
export * from "./errors";
