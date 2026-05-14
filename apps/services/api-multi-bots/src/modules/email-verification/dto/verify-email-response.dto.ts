import { ApiProperty } from '@nestjs/swagger';

/**
 * Respuesta exitosa del endpoint GET /auth/verify-email (HTTP 200).
 */
export class VerifyEmailSuccessResponseDto {
  @ApiProperty({
    description: 'Indica que el email fue verificado exitosamente.',
    example: true,
  })
  verified!: boolean;

  @ApiProperty({
    description: 'Mensaje de confirmación para el usuario.',
    example: 'Email verificado exitosamente',
  })
  message!: string;

  @ApiProperty({
    description: 'Indica si el usuario tiene una sesión activa (Authorization header presente). Útil para decidir si redirigir al dashboard o al login.',
    example: false,
  })
  hasActiveSession!: boolean;
}
