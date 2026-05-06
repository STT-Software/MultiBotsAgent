/**
 * Ejemplo de validador de lógica de negocio.
 * Este paquete NO debe tener dependencias de AWS (aws-sdk, @aws-sdk/*, aws-lambda, sst).
 * Solo lógica de negocio pura, reutilizable en frontend, Lambdas y Fargate.
 *
 * Reemplaza este archivo con los validadores reales de tu aplicación.
 */
import type { CreateExampleDto } from "@multibotagents/types";

export function validateCreateExample(dto: CreateExampleDto): string[] {
  const errors: string[] = [];

  if (!dto.name || dto.name.trim().length === 0) {
    errors.push("El nombre es requerido");
  }

  if (dto.name && dto.name.length > 255) {
    errors.push("El nombre no puede exceder 255 caracteres");
  }

  return errors;
}
