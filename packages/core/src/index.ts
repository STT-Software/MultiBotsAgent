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
