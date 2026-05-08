import { ApiProperty } from '@nestjs/swagger';

class UserResponseDto {
  @ApiProperty({ description: 'ID único del usuario (ObjectId).', example: '6643a1b2c3d4e5f6a7b8c9d0' })
  id!: string;

  @ApiProperty({ description: 'Email normalizado del usuario.', example: 'admin@miempresa.com' })
  email!: string;

  @ApiProperty({ description: 'Estado de verificación del email.', example: false })
  emailVerified!: boolean;
}

class CompanyResponseDto {
  @ApiProperty({ description: 'ID único de la empresa (ObjectId).', example: '6643a1b2c3d4e5f6a7b8c9d1' })
  id!: string;

  @ApiProperty({ description: 'Nombre de la empresa registrada.', example: 'Mi Empresa SAS' })
  name!: string;
}

/**
 * Respuesta exitosa del registro (HTTP 201).
 *
 * El `refreshToken` se envía como cookie httpOnly y NO aparece en el body.
 */
export class RegisterSuccessResponseDto {
  @ApiProperty({
    description: 'JWT de acceso (HS256). Expira en 30 minutos. Usar en header Authorization: Bearer <token>.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjQzYTFiMmMzZDRlNWY2YTdiOGM5ZDAiLCJjb21wYW55SWQiOiI2NjQzYTFiMmMzZDRlNWY2YTdiOGM5ZDEiLCJlbWFpbCI6ImFkbWluQG1pZW1wcmVzYS5jb20iLCJlbWFpbFZlcmlmaWVkIjpmYWxzZSwiaWF0IjoxNzE1MTgwMDAwLCJleHAiOjE3MTUxODE4MDB9.abc123',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Datos del usuario creado.', type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ description: 'Datos de la empresa creada.', type: CompanyResponseDto })
  company!: CompanyResponseDto;
}
