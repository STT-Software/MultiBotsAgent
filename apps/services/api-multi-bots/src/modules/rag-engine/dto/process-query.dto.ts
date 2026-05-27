import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class ProcessQueryDto {
  @ApiProperty({
    description: "ID de la conversación en curso (ej: whatsapp_+5491122334455)",
    example: "whatsapp_+5491122334455",
  })
  @IsNotEmpty({ message: "conversationId es obligatorio" })
  @IsString({ message: "conversationId debe ser un string" })
  conversationId!: string;

  @ApiProperty({
    description: "Mensaje enviado por el usuario para procesar con RAG",
    example: "Hola, ¿cuáles son los precios de los planes?",
  })
  @IsNotEmpty({ message: "userMessage es obligatorio" })
  @IsString({ message: "userMessage debe ser un string" })
  userMessage!: string;

  @ApiProperty({
    description: "Fecha y hora del mensaje original (opcional)",
    example: "2026-05-27T13:44:43.000Z",
    required: false,
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}
