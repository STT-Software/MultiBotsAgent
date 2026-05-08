import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Respuesta de error de validación (HTTP 400).
 * Incluye detalle por campo cuando la validación falla.
 */
export class ValidationErrorResponseDto {
  @ApiProperty({
    description: 'Mensaje general del error.',
    example: 'Datos de registro inválidos',
  })
  error!: string;

  @ApiPropertyOptional({
    description: 'Mapa de campo → mensaje de error para cada campo que falló la validación.',
    example: {
      email: 'Formato de email inválido',
      password: 'Mínimo 8 caracteres',
    },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  fields?: Record<string, string>;
}

/**
 * Respuesta de error CAPTCHA (HTTP 403).
 */
export class CaptchaErrorResponseDto {
  @ApiProperty({
    description: 'Mensaje de error del challenge de seguridad.',
    example: 'El challenge de seguridad no fue superado. Intenta nuevamente.',
  })
  error!: string;
}

/**
 * Respuesta de error de conflicto (HTTP 409).
 * Se retorna cuando el email ya está registrado.
 */
export class ConflictErrorResponseDto {
  @ApiProperty({
    description: 'Mensaje indicando que el email ya existe.',
    example: 'Ya existe una cuenta con este email. ¿Deseas iniciar sesión?',
  })
  error!: string;
}

/**
 * Respuesta de error interno del servidor (HTTP 500).
 */
export class InternalErrorResponseDto {
  @ApiProperty({
    description: 'Mensaje genérico de error interno.',
    example: 'Error interno del servidor',
  })
  error!: string;
}
