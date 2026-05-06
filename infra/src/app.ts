/**
 * Orquestador de infraestructura.
 * Importa todos los módulos de recursos en el orden correcto.
 * Recursos base primero, dependientes después.
 *
 * Este archivo es llamado desde sst.config.ts → run()
 */

// 1. Networking y recursos base
import "./networking/vpc";
import "./shared/secrets";

// 2. Almacenamiento y bases de datos
import "./storage/buckets";
import "./databases/mongodb";

// 3. Eventos
import "./events/queues";

// 4. Cómputo (depende de los anteriores)
import "./apis/main-api";
import "./services/workers";

// 5. Frontend
import "./web";
