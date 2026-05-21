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
export * from "./auth/password.service";
export * from "./auth/token.service";
export * from "./auth/captcha.service";
export * from "./auth/register.service";

// RAG Engine
export * from "./rag-engine/threshold-filter";
export * from "./rag-engine/token-management";
export * from "./rag-engine/prompt-building";

// Knowledge — Extracción de texto y chunking
export * from "./knowledge";
