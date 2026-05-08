import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { RegisterDto } from '@multibotagents/types';
import {
  ValidationError,
  CaptchaError,
  DuplicateEmailError,
  ConcurrencyConflictError,
} from '@multibotagents/types';
import { RegisterNestService } from './register.service';
import {
  RegisterRequestDto,
  RegisterSuccessResponseDto,
  ValidationErrorResponseDto,
  CaptchaErrorResponseDto,
  ConflictErrorResponseDto,
  InternalErrorResponseDto,
} from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly registerService: RegisterNestService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar empresa y usuario',
    description: `
Crea una nueva empresa (tenant) y su usuario administrador en una transacción atómica.

## Flujo
1. Valida y sanitiza los datos de entrada
2. Verifica el CAPTCHA (omitido en desarrollo si no hay secrets configurados)
3. Verifica unicidad del email
4. Crea Company + User + RefreshToken en transacción MongoDB
5. Genera Access Token JWT (30 min)
6. Encola email de verificación (no bloqueante)
7. Retorna tokens y datos del usuario/empresa

## Autenticación
Este endpoint es **público** (no requiere autenticación).

## Cookies
En respuesta exitosa (201), se setea una cookie \`refreshToken\`:
- **httpOnly:** true (no accesible desde JavaScript)
- **secure:** true (solo HTTPS)
- **sameSite:** strict
- **path:** /auth/refresh
- **maxAge:** 7 días

## Notas
- El email se normaliza a minúsculas antes de almacenar
- La contraseña se hashea con bcrypt (cost factor 12)
- El CAPTCHA se puede deshabilitar en desarrollo dejando los secrets vacíos
    `,
  })
  @ApiBody({
    type: RegisterRequestDto,
    description: 'Datos de registro de empresa y usuario administrador.',
    examples: {
      'registro-basico': {
        summary: 'Registro básico (campos obligatorios)',
        description: 'Solo los campos requeridos para crear una cuenta.',
        value: {
          companyName: 'Mi Empresa SAS',
          email: 'admin@miempresa.com',
          password: 'SecurePass1',
          country: 'CO',
          category: 'sales',
          size: '2-5',
        },
      },
      'registro-completo': {
        summary: 'Registro completo (todos los campos)',
        description: 'Incluye teléfono, fuente de referencia y CAPTCHA.',
        value: {
          companyName: 'Tech Solutions Colombia',
          email: 'ceo@techsolutions.co',
          password: 'MyStr0ngP@ss',
          country: 'CO',
          category: 'customer_support',
          size: '6-10',
          phone: '3001234567',
          phoneCountryCode: '+57',
          referralSource: 'google',
          captchaToken: '03AGdBq24PBxR...',
        },
      },
      'registro-mexico': {
        summary: 'Registro desde México',
        description: 'Ejemplo con datos de una empresa mexicana.',
        value: {
          companyName: 'Soluciones Digitales MX',
          email: 'contacto@soldigitales.mx',
          password: 'Mexico2024!',
          country: 'MX',
          category: 'ecommerce',
          size: '11-20',
          phone: '5512345678',
          phoneCountryCode: '+52',
          referralSource: 'instagram',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Registro exitoso. Empresa y usuario creados. Se setea cookie `refreshToken` (httpOnly).',
    type: RegisterSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación. Los datos enviados no cumplen los requisitos.',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Error de CAPTCHA. El challenge de seguridad no fue superado.',
    type: CaptchaErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto. Ya existe una cuenta con el email proporcionado.',
    type: ConflictErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
    type: InternalErrorResponseDto,
  })
  async register(
    @Body() dto: RegisterRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.registerService.register(dto as RegisterDto);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth/refresh',
        maxAge: 604800000, // 7 days in ms
      });

      res.status(HttpStatus.CREATED);

      return {
        accessToken: result.accessToken,
        user: result.user,
        company: result.company,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(HttpStatus.BAD_REQUEST);
        return { error: error.message, fields: error.fields };
      }

      if (error instanceof CaptchaError) {
        res.status(HttpStatus.FORBIDDEN);
        return { error: error.message };
      }

      if (error instanceof DuplicateEmailError) {
        res.status(HttpStatus.CONFLICT);
        return { error: error.message };
      }

      if (error instanceof ConcurrencyConflictError) {
        res.status(HttpStatus.CONFLICT);
        return { error: error.message };
      }

      this.logger.error('Unexpected error during registration', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return { error: 'Error interno del servidor' };
    }
  }
}
