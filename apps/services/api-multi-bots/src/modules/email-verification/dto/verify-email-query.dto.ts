import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para el query param del endpoint GET /auth/verify-email.
 *
 * El token es generado por `crypto.randomBytes(32).toString('hex')` y tiene
 * exactamente 64 caracteres hexadecimales.
 */
export class VerifyEmailQueryDto {
  @ApiProperty({
    description: 'Token de verificación de email. Cadena hexadecimal de 64 caracteres generada con crypto.randomBytes(32). Es de un solo uso.',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    minLength: 64,
    maxLength: 64,
    pattern: '^[0-9a-f]{64}$',
  })
  token!: string;
}
