import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para la solicitud de inicio de sesion.
 */
export class LoginRequestDto {
  @ApiProperty({
    description: 'Email del usuario administrador.',
    example: 'admin@miempresa.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'El formato de email es invalido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email!: string;

  @ApiProperty({
    description: 'Contraseña del usuario.',
    example: 'SecurePass123',
    format: 'password',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}
