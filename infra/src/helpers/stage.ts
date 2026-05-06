/**
 * Utilidades para determinar el tipo de stage.
 *
 * - Stage personal (sst dev --stage juan): recursos de cómputo aislados, estado compartido
 * - Entorno real (dev, prod): todos los recursos son propios
 */

// Lista de entornos reales. Agregar aquí nuevos entornos (staging, qa, etc.)
const REAL_ENVIRONMENTS = ["dev", "prod"];

/**
 * Determina si el stage actual es un stage personal de desarrollador.
 * Un stage personal es cualquiera que NO sea un entorno real.
 */
export function isPersonalStage(stage: string): boolean {
  return !REAL_ENVIRONMENTS.includes(stage);
}

/**
 * Determina si el stage actual es producción.
 */
export function isProduction(stage: string): boolean {
  return stage === "prod";
}
