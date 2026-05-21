import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO de entrada para el restablecimiento de contraseña con token.
 *
 * @example
 * {
 *   "token": "a1b2c3d4e5f6...",
 *   "newPassword": "NuevaSegura456@"
 * }
 */
export class ResetPasswordRequestDto {
  @ApiProperty({
    description: 'Token de restablecimiento recibido por email.',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'Nueva contraseña que cumple requisitos de seguridad.',
    example: 'NuevaSegura456@',
    format: 'password',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  newPassword!: string;
}
