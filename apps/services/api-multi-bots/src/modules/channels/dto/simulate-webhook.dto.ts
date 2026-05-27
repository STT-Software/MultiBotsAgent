import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SimulateWebhookDto {
  @ApiProperty({
    description: 'ID del agente para el cual se simulará el mensaje de WhatsApp.',
    example: '683da2f1e4b0a1c2d3e4f5a6',
  })
  @IsString()
  @IsNotEmpty()
  agentId!: string;

  @ApiProperty({
    description: 'Texto del mensaje entrante que se desea simular.',
    example: 'Hola, ¿cómo puedo agendar una cita?',
  })
  @IsString()
  @IsNotEmpty()
  messageText!: string;

  @ApiProperty({
    description: 'Número de teléfono remitente del mensaje simulado.',
    example: '573024883835',
    required: false,
  })
  @IsString()
  @IsOptional()
  senderPhoneNumber?: string;
}
