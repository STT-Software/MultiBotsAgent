/**
 * @multibotagents/db
 *
 * Capa de abstracción de base de datos.
 * Exporta interfaces públicas, esquemas y adaptadores concretos.
 *
 * Los consumidores importan la interfaz Repository y las implementaciones
 * concretas del adaptador MongoDB para inyección de dependencias.
 */

// Interfaces públicas
export type { Repository } from "./interfaces/repository.interface";

// Esquemas MongoDB (documentos, colecciones, índices, validaciones)
export * from "./schemas/index";

// Adaptadores MongoDB (repositorios concretos)
export * from "./adapters/mongodb/index";
