/**
 * @multibotagents/core
 *
 * Lógica de negocio pura. Sin dependencias de AWS.
 * Usable en frontend (Next.js), Lambdas y servicios Fargate (NestJS).
 *
 * IMPORTANTE: Este paquete NO debe importar de:
 * - aws-sdk / @aws-sdk/*
 * - aws-lambda
 * - @aws-cdk/*
 * - sst
 */

// Validators
export * from "./validators/example.validator";

// Auth
export * from "./auth/register.validator";
export * from "./auth/password.validator";
export * from "./auth/password.service";
export * from "./auth/token.service";
export * from "./auth/captcha.service";
export * from "./auth/register.service";
export * from "./auth/rate-limit.service";
export * from "./auth/login.service";
export * from "./auth/refresh.service";
export * from "./auth/logout.service";
export * from "./auth/change-password.service";
export * from "./auth/interfaces/change-password.interfaces";
export * from "./auth/forgot-password.service";
export {
  ResetPasswordService,
  PasswordValidationError as ResetPasswordValidationError,
} from "./auth/reset-password.service";
export {
  TokenInvalidError as ResetTokenInvalidError,
  TokenExpiredError as ResetTokenExpiredError,
  TokenAlreadyUsedError as ResetTokenAlreadyUsedError,
} from "./auth/reset-password.service";
export * from "./auth/interfaces/password-recovery.interfaces";

// Email Verification
export * from "./email-verification";

// Company Profile
export * from "./company-profile";

// RAG Engine
export * from "./rag-engine";

// Knowledge
export * from "./knowledge";

// WhatsApp
export * from "./whatsapp";

// Conversational Memory
export * from "./memory";

// Notifications
export * from "./notifications";
