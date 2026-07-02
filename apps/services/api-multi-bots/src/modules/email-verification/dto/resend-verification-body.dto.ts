import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsHexadecimal, Length, ValidateIf } from 'class-validator';

/**
 * DTO para el body del endpoint POST /auth/resend-verification.
 *
 * El `expiredToken` es opcional: se usa cuando el usuario no tiene sesión activa
 * pero posee un token expirado (desde la página de verificación).
 * Si el usuario está autenticado (JWT), el userId se extrae del token de acceso.
 */
export class ResendVerificationBodyDto {
  @ApiPropertyOptional({
    description: 'Token de verificación expirado. Se usa para identificar al usuario cuando no hay sesión activa (JWT). Cadena hexadecimal de 64 caracteres.',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    minLength: 64,
    maxLength: 64,
    pattern: '^[0-9a-f]{64}$',
  })
  @ValidateIf((o) => o.expiredToken !== undefined)
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  expiredToken?: string;
}
