/**
 * Adaptador MongoDB — Implementaciones concretas de los repositorios.
 *
 * Cada repositorio recibe una instancia de `Db` (mongodb driver) en el constructor
 * y expone métodos de dominio con conversión automática entre documentos MongoDB
 * (ObjectId) y entidades de dominio (string ids).
 */

export {
  CompanyRepository,
  type CreateCompanyData,
  type ICompanyRepository,
} from "./company.repository";

export {
  UserRepository,
  type CreateUserData,
  type IUserRepository,
} from "./user.repository";

export {
  RefreshTokenRepository,
  type CreateRefreshTokenData,
  type IRefreshTokenRepository,
} from "./refresh-token.repository";

export {
  VerifyTokenRepository,
  type IVerifyTokenRepository,
} from "./verify-token.repository";

export {
  EmailQueueRepository,
  type EnqueueEmailData,
  type IEmailQueueRepository,
} from "./email-queue.repository";
