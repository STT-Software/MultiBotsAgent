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

// Shared (cross-cutting concerns)
import "./shared/secrets";
import "./shared/log-groups";

// Databases
import "./databases/mongodb";

// Storage
import "./storage/company-logos";
import "./storage/knowledge-bucket";

// Queues
import "./queues/indexation-queue";

// Services
import "./services/cluster";
import "./services/api-multi-bots";

// Monitoring & Alarms (depends on log-groups for LogGroup resource)
import "./shared/alarms";

// APIs
import "./apis/services-api";
import "./apis/functions-api";

// Functions (Lambda handlers)
import "./functions/indexation-handler";

// Frontend
import "./frontend/web";
