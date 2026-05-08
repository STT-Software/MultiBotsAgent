/**
 * Orquestador de infraestructura.
 * Importa todos los módulos de recursos en el orden correcto.
 *
 * Este archivo es llamado desde sst.config.ts → run()
 */

// Helpers
import "./helpers/stage";

// Networking
import "./networking/vpc";

// Databases
import "./databases/mongodb";
import "./databases/secrets";

// Services
import "./services/cluster";
import "./services/api-multi-bots";

// APIs
import "./apis/services-api";
import "./apis/functions-api";

// Frontend
import "./frontend/web";
