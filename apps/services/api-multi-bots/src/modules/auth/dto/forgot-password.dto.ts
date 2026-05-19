import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * DTO de entrada para la solicitud de restablecimiento de contraseña.
 *
 * @example
 * {
 *   "email": "usuario@empresa.com"
 * }
 */
export class ForgotPasswordRequestDto {
  @ApiProperty({
    description: 'Email de la cuenta registrada.',
    example: 'usuario@empresa.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
