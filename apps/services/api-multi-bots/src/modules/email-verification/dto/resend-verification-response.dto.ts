import { ApiProperty } from '@nestjs/swagger';

/**
 * Respuesta exitosa del endpoint POST /auth/resend-verification (HTTP 200).
 */
export class ResendVerificationSuccessResponseDto {
  @ApiProperty({
    description: 'Indica que el reenvío fue exitoso.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Mensaje de confirmación para el usuario.',
    example: 'Email de verificación reenviado',
  })
  message!: string;

  @ApiProperty({
    description: 'Email al que se reenvió la verificación (parcialmente oculto por privacidad).',
    example: 'u***@example.com',
  })
  email!: string;
}
