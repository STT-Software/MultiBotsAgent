/**
 * Barrel export — módulo email-verification
 *
 * Re-exporta servicios, errores y adaptadores del dominio de verificación de email.
 * Las interfaces internas (IVerifyTokenRepository, IUserRepository, etc.) NO se
 * re-exportan desde aquí para evitar conflictos con las interfaces del módulo auth.
 * Los consumidores que necesiten esas interfaces deben importar directamente desde
 * './email-verification.service'.
 */

// Token service (renamed to avoid conflict with auth/token.service TokenService)
export { TokenService as EmailTokenService } from './token.service';

// Domain errors
export * from './errors';

// Adapters
export * from './adapters/elastic-email.sender';

// Email verification service — export only the class and config/result types
export {
  EmailVerificationService,
  type EmailVerificationServiceDeps,
  type EmailVerificationConfig,
  type VerifyTokenResult,
  type ResendResult,
} from './email-verification.service';

// Email worker service
export {
  EmailWorkerService,
  type EmailWorkerServiceDeps,
  type EmailWorkerConfig,
  type WorkerResult,
  type IEmailWorkerQueueRepository,
} from './email-worker.service';
