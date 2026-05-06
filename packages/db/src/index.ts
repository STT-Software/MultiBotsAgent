/**
 * @multibotagents/db
 *
 * Capa de abstracción de base de datos.
 * Exporta SOLO las interfaces públicas. Los adaptadores concretos
 * (mongodb, postgresql, dynamodb) NO se exportan directamente desde aquí.
 *
 * Los consumidores importan la interfaz Repository y reciben la
 * implementación concreta vía inyección de dependencias o configuración.
 */

// Interfaces públicas
export type { Repository } from "./interfaces/repository.interface";
