/**
 * Orquestador de infraestructura.
 * Importa todos los módulos de recursos en el orden correcto.
 *
 * Este archivo es llamado desde sst.config.ts → run()
 */

// Helpers
import "./helpers/stage";

// Frontend
import "./web";
