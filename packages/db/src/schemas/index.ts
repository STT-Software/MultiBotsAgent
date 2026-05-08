/**
 * Barrel export para todos los esquemas MongoDB.
 *
 * Cada esquema exporta:
 * - Interfaz del documento MongoDB (con ObjectId)
 * - Constante con el nombre de la colección
 * - Definiciones de índices (para creación vía migración)
 * - JSON Schema de validación (para createCollection)
 */

export {
  COMPANIES_COLLECTION,
  COMPANIES_INDEXES,
  COMPANIES_VALIDATION,
  type CompanyDocument,
} from "./company.schema";

export {
  USERS_COLLECTION,
  USERS_INDEXES,
  USERS_VALIDATION,
  type UserDocument,
} from "./user.schema";

export {
  REFRESH_TOKENS_COLLECTION,
  REFRESH_TOKENS_INDEXES,
  REFRESH_TOKENS_VALIDATION,
  type RefreshTokenDocument,
} from "./refresh-token.schema";

export {
  VERIFY_TOKENS_COLLECTION,
  VERIFY_TOKENS_INDEXES,
  VERIFY_TOKENS_VALIDATION,
  type VerifyTokenDocument,
} from "./verify-token.schema";

export {
  EMAIL_QUEUE_COLLECTION,
  EMAIL_QUEUE_INDEXES,
  EMAIL_QUEUE_VALIDATION,
  type EmailQueueDocument,
} from "./email-queue.schema";
