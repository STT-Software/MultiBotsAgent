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

// Databases
import "./databases/mongodb";

// Knowledge Base — Pipeline de ingesta de documentos
// Orden: bucket (sin deps) → colas (dependen del bucket) → handler (depende de bucket + cola)
import "./storage/knowledge-bucket";
import "./queues/indexation-queue";
import "./functions/indexation-handler";

// Services
import "./services/cluster";
import "./services/api-multi-bots";

// APIs
import "./apis/services-api";
import "./apis/functions-api";

// Frontend
import "./frontend/web";
