import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Respuesta exitosa del cambio de contraseña (HTTP 200).
 */
export class ChangePasswordSuccessResponseDto {
  @ApiProperty({
    description: 'Indica que la operación fue exitosa.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Mensaje de confirmación del cambio.',
    example: 'Contraseña actualizada exitosamente',
  })
  message!: string;
}

/**
 * Respuesta de error de validación para cambio de contraseña (HTTP 400).
 * Cubre: validación fallida, contraseña actual incorrecta, nueva igual a actual.
 */
export class ChangePasswordBadRequestResponseDto {
  @ApiProperty({
    description: 'Mensaje descriptivo del error.',
    example: 'La contraseña actual no es correcta',
  })
  error!: string;

  @ApiProperty({
    description: 'Código de error específico para identificar el tipo de fallo.',
    enum: ['INVALID_CURRENT_PASSWORD', 'SAME_AS_CURRENT', 'VALIDATION_FAILED', 'USER_NOT_FOUND'],
    example: 'INVALID_CURRENT_PASSWORD',
  })
  code!: string;

  @ApiPropertyOptional({
    description: 'Lista de reglas de contraseña no cumplidas (solo cuando code es VALIDATION_FAILED).',
    example: ['MIN_LENGTH', 'UPPERCASE', 'SPECIAL_CHAR'],
    type: [String],
  })
  failedRules?: string[];
}

/**
 * Respuesta de rate limit excedido (HTTP 429).
 */
export class ChangePasswordRateLimitResponseDto {
  @ApiProperty({
    description: 'Mensaje indicando que se excedió el límite de intentos.',
    example: 'Demasiados intentos. Intenta en 15 minutos',
  })
  error!: string;

  @ApiProperty({
    description: 'Código de error.',
    example: 'RATE_LIMIT_EXCEEDED',
  })
  code!: string;

  @ApiPropertyOptional({
    description: 'Segundos restantes hasta que se desbloquee la funcionalidad.',
    example: 900,
  })
  retryAfterSeconds?: number;
}
