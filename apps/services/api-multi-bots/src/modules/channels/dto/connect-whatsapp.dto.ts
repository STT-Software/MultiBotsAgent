import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

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
    description: 'Código de autorización de corta duración retornado por Meta al completar el Embedded Signup.',
    example: 'AQBx...',
  })
  @IsString()
  @IsNotEmpty()
  tokenCode!: string;
}
