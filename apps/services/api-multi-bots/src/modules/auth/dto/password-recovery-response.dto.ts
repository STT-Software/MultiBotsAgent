import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Respuesta genérica del endpoint forgot-password (HTTP 200).
 * Siempre retorna el mismo mensaje independientemente de si el email existe o no.
 */
export class ForgotPasswordSuccessResponseDto {
  @ApiProperty({
    description: 'Mensaje genérico que no revela si el email existe en el sistema.',
    example: 'Si el email está registrado, recibirás un correo con instrucciones',
  })
  message!: string;
}

/**
 * Respuesta exitosa del endpoint reset-password (HTTP 200).
 */
export class ResetPasswordSuccessResponseDto {
  @ApiProperty({
    description: 'Indica que la operación fue exitosa.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Mensaje de confirmación del restablecimiento.',
    example: 'Contraseña restablecida exitosamente',
  })
  message!: string;
}

/**
 * Respuesta de error del endpoint reset-password (HTTP 400).
 * Cubre: TOKEN_INVALID, TOKEN_EXPIRED, TOKEN_ALREADY_USED, VALIDATION_FAILED.
 */
export class ResetPasswordBadRequestResponseDto {
  @ApiProperty({
    description: 'Mensaje descriptivo del error.',
    example: 'El enlace ha expirado. Solicita uno nuevo',
  })
  error!: string;

  @ApiProperty({
    description: 'Código de error específico para identificar el tipo de fallo.',
    enum: ['TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_ALREADY_USED', 'VALIDATION_FAILED'],
    example: 'TOKEN_EXPIRED',
  })
  code!: string;

  @ApiPropertyOptional({
    description: 'Lista de reglas de contraseña no cumplidas (solo cuando code es VALIDATION_FAILED).',
    example: ['MIN_LENGTH', 'UPPERCASE', 'SPECIAL_CHAR'],
    type: [String],
  })
  failedRules?: string[];
}
