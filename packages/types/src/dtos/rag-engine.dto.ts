/**
 * DTOs de validación para el Motor de Agente RAG.
 * Usa class-validator para validación declarativa de entrada.
 *
 * Valida: Requisitos 1.1, 1.2, 1.3
 */

import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

import type { RagProcessInput } from "../interfaces/rag-engine-io.interfaces";

/**
 * Validador personalizado que rechaza strings compuestos solo de espacios en blanco.
 * Complementa @IsNotEmpty que solo rechaza strings vacíos ("").
 */
@ValidatorConstraint({ name: "isNotWhitespaceOnly", async: false })
export class IsNotWhitespaceOnly implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") {
      return false;
    }
    return value.trim().length > 0;
  }

  defaultMessage(): string {
    return "El mensaje no puede estar vacío o contener solo espacios en blanco";
  }
}

/**
 * DTO de validación para la entrada del proceso RAG.
 * Implementa la interface RagProcessInput con decoradores de validación.
 */
export class RagProcessInputDto implements RagProcessInput {
  @IsUUID()
  @IsNotEmpty()
  @IsString()
  agentId!: string;

  @IsUUID()
  @IsNotEmpty()
  @IsString()
  conversationId!: string;

  @IsString()
  @IsOptional()
  userMessage!: string;

  @IsDate()
  @Type(() => Date)
  timestamp!: Date;

  @IsString()
  @IsOptional()
  channelId?: string;

  @IsString()
  @IsOptional()
  messageType?: "text" | "audio" | "image";

  @IsString()
  @IsOptional()
  mediaId?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;
}
