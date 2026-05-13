import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Respuesta de error genérica para los endpoints de email-verification.
 * Cubre los códigos: TOKEN_INVALID, TOKEN_ALREADY_USED, TOKEN_EXPIRED,
 * ALREADY_VERIFIED, RESEND_COOLDOWN, UNAUTHORIZED, EMAIL_NOT_VERIFIED.
 */
export class EmailVerificationErrorResponseDto {
  @ApiProperty({
    description: 'Código de error que identifica el tipo de fallo.',
    example: 'TOKEN_INVALID',
    enum: [
      'TOKEN_INVALID',
      'TOKEN_ALREADY_USED',
      'TOKEN_EXPIRED',
      'ALREADY_VERIFIED',
      'RESEND_COOLDOWN',
      'UNAUTHORIZED',
      'EMAIL_NOT_VERIFIED',
      'INTERNAL_ERROR',
    ],
  })
  error!: string;

  @ApiProperty({
    description: 'Mensaje legible para el usuario describiendo el error.',
    example: 'El link de verificación no es válido',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Segundos restantes antes de poder reenviar. Solo presente en error RESEND_COOLDOWN.',
    example: 45,
  })
  retryAfter?: number;
}
