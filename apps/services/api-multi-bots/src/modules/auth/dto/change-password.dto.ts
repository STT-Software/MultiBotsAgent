import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO de entrada para el cambio de contraseña.
 *
 * @example
 * {
 *   "currentPassword": "OldPass123!",
 *   "newPassword": "NewSecure456@"
 * }
 */
export class ChangePasswordRequestDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario.',
    example: 'OldPass123!',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({
    description: 'Nueva contraseña que cumple requisitos de seguridad.',
    example: 'NewSecure456@',
    format: 'password',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  newPassword!: string;
}
