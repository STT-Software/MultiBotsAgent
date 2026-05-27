import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO para la solicitud de conexión de un canal de WhatsApp.
 * Valida que todos los campos requeridos estén presentes y sean strings no vacíos.
 *
 * @example
 * {
 *   "agentId": "683da2f1e4b0a1c2d3e4f5a6",
 *   "wabaId": "123456789012345",
 *   "phoneNumberId": "987654321098765",
 *   "tokenCode": "AQB..."
 * }
 */
export class ConnectWhatsAppDto {
  @ApiProperty({
    description: 'ID del agente al que se conectará el canal de WhatsApp.',
    example: '683da2f1e4b0a1c2d3e4f5a6',
  })
  @IsString()
  @IsNotEmpty()
  agentId!: string;

  @ApiProperty({
    description: 'WhatsApp Business Account ID obtenido del flujo de Embedded Signup.',
    example: '123456789012345',
  })
  @IsString()
  @IsNotEmpty()
  wabaId!: string;

  @ApiProperty({
    description: 'Phone Number ID asignado por Meta al número registrado en el WABA.',
    example: '987654321098765',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumberId!: string;

  @ApiProperty({
    description: 'Código de autorización de corta duración retornado por Meta al completar el Embedded Signup (opcional si se provee accessToken).',
    example: 'AQBx...',
    required: false,
  })
  @IsString()
  @IsOptional()
  tokenCode?: string;

  @ApiProperty({
    description: 'Access Token de larga duración de WhatsApp Business (requerido si no se provee tokenCode).',
    example: 'EAASyO...',
    required: false,
  })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiProperty({
    description: 'PIN de verificación en dos pasos de Meta (opcional, por defecto 000000).',
    example: '123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  pin?: string;
}
