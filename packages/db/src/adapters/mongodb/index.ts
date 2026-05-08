/**
 * Adaptador MongoDB — Implementaciones concretas de los repositorios.
 *
 * Cada repositorio recibe una instancia de `Db` (mongodb driver) en el constructor
 * y expone métodos de dominio con conversión automática entre documentos MongoDB
 * (ObjectId) y entidades de dominio (string ids).
 *
 * Las interfaces y DTOs se importan desde `../../interfaces/`.
 */

export { CompanyRepository } from "./company.repository";
export { UserRepository } from "./user.repository";
export { RefreshTokenRepository } from "./refresh-token.repository";
export { VerifyTokenRepository } from "./verify-token.repository";
export { EmailQueueRepository } from "./email-queue.repository";

// Re-export interfaces desde la carpeta centralizada
export type {
  CreateCompanyData,
  ICompanyRepository,
  CreateUserData,
  IUserRepository,
  CreateRefreshTokenData,
  IRefreshTokenRepository,
  IVerifyTokenRepository,
  EnqueueEmailData,
  IEmailQueueRepository,
} from "../../interfaces";
