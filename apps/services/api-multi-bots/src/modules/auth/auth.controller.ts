import {
  Controller,
  Post,
  Patch,
  Body,
  Req,
  Res,
  HttpStatus,
  UseGuards,
  UseFilters,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { RegisterDto } from '@multibotagents/types';
import {
  ValidationError,
  CaptchaError,
  DuplicateEmailError,
  ConcurrencyConflictError,
  TokenExpiredError,
} from '@multibotagents/types';
import { sanitizePasswordInput } from '@multibotagents/core';
import { RegisterNestService } from './register.service';
import { LoginNestService } from './login.service';
import { RefreshNestService } from './refresh.service';
import { LogoutNestService } from './logout.service';
import { ChangePasswordNestService } from './change-password-nest.service';
import { ForgotPasswordNestService } from './forgot-password-nest.service';
import { ResetPasswordNestService } from './reset-password-nest.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthExceptionFilter } from './filters/auth-exception.filter';
import { SkipEmailVerification } from '../email-verification/decorators/skip-email-verification.decorator';
import {
  ChangePasswordRequestDto,
  ChangePasswordSuccessResponseDto,
  ChangePasswordBadRequestResponseDto,
  ChangePasswordRateLimitResponseDto,
  RegisterRequestDto,
  RegisterSuccessResponseDto,
  ValidationErrorResponseDto,
  CaptchaErrorResponseDto,
  ConflictErrorResponseDto,
  InternalErrorResponseDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  LoginRequestDto,
  ForgotPasswordSuccessResponseDto,
  ResetPasswordSuccessResponseDto,
  ResetPasswordBadRequestResponseDto,
} from './dto';

/** Cookie configuration for refresh token (7 days in ms). */
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/auth/refresh',
  maxAge: 604800000,
};

@ApiTags('Auth')
@SkipEmailVerification()
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly registerService: RegisterNestService,
    private readonly loginService: LoginNestService,
    private readonly refreshService: RefreshNestService,
    private readonly logoutService: LogoutNestService,
    private readonly changePasswordNestService: ChangePasswordNestService,
    private readonly forgotPasswordNestService: ForgotPasswordNestService,
    private readonly resetPasswordNestService: ResetPasswordNestService,
  ) {}

  // ─── POST /auth/register ─────────────────────────────────────────────────

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
    `,
  })
  @ApiBody({
    type: RegisterRequestDto,
    description: 'Datos de registro de empresa y usuario administrador.',
    examples: {
      'registro-basico': {
        summary: 'Registro básico (campos obligatorios)',
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
    },
  })
  @ApiResponse({ status: 201, description: 'Registro exitoso. Cookie refreshToken seteada.', type: RegisterSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Error de validación.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 403, description: 'CAPTCHA fallido.', type: CaptchaErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Email ya registrado.', type: ConflictErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Error interno.', type: InternalErrorResponseDto })
  async register(
    @Body() dto: RegisterRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.registerService.register(dto as RegisterDto);

      res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
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

  // ─── POST /auth/login ────────────────────────────────────────────────────

  @Post('login')
  @UseFilters(AuthExceptionFilter)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Autentica al usuario con email y contraseña. Retorna access token JWT (30 min) y setea refresh token (7 días) como cookie httpOnly. Implementa rate limiting por IP y email, sesión única por usuario.',
  })
  @ApiBody({
    description: 'Credenciales de acceso',
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'admin@acmecorp.com' },
        password: { type: 'string', example: 'SecurePass123' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Cookie refreshToken seteada.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
        user: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: '683da2f1e4b0a1c2d3e4f5a6' },
            email: { type: 'string', example: 'admin@acmecorp.com' },
            companyId: { type: 'string', example: '683da2f0e4b0a1c2d3e4f5a5' },
            emailVerified: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  @ApiResponse({ status: 403, description: 'Empresa en estado pending_deletion.' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido.' })
  @ApiResponse({ status: 500, description: 'Error interno.' })
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const result = await this.loginService.login(dto.email, dto.password, ip);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(HttpStatus.OK);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  // ─── POST /auth/refresh ──────────────────────────────────────────────────

  @Post('refresh')
  @UseFilters(AuthExceptionFilter)
  @ApiCookieAuth('refreshToken')
  @ApiOperation({
    summary: 'Renovar access token',
    description: 'Genera un nuevo access token usando el refresh token de la cookie httpOnly. No requiere Authorization header.',
  })
  @ApiResponse({ status: 200, description: 'Nuevo access token generado.' })
  @ApiResponse({ status: 401, description: 'Refresh token expirado o sesión reemplazada.' })
  @ApiResponse({ status: 403, description: 'Empresa no activa.' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new TokenExpiredError();
    }

    const result = await this.refreshService.refresh(refreshToken);
    res.status(HttpStatus.OK);

    return { accessToken: result.accessToken };
  }

  // ─── POST /auth/logout ───────────────────────────────────────────────────

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @UseFilters(AuthExceptionFilter)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Revoca el refresh token activo y elimina la cookie httpOnly. Requiere access token válido.',
  })
  @ApiHeader({ name: 'Authorization', description: 'Bearer access token JWT', required: true })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente.' })
  @ApiResponse({ status: 401, description: 'Access token inválido o expirado.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = (req as any).user;
    await this.logoutService.logout(user.userId);

    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 0,
    });

    res.status(HttpStatus.OK);
    return { message: 'Sesión cerrada exitosamente' };
  }

  // ─── PATCH /auth/change-password ─────────────────────────────────────────

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @UseFilters(AuthExceptionFilter)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Cambiar contraseña',
    description: `
Permite al usuario autenticado cambiar su contraseña verificando la actual.

## Flujo
1. Verifica la contraseña actual contra el hash almacenado (bcrypt)
2. Valida que la nueva contraseña cumpla los requisitos de seguridad (mín. 8 chars, mayúscula, minúscula, dígito, carácter especial)
3. Verifica que la nueva contraseña sea diferente a la actual
4. Genera nuevo hash bcrypt (cost factor 12)
5. Actualiza el hash en MongoDB con operación atómica (updateOne)
6. Resetea el contador de intentos fallidos

## Autenticación
Requiere **Bearer token JWT** válido en el header \`Authorization\`.
El userId se extrae exclusivamente del JWT (no se acepta como parámetro del body).

## Rate Limiting
Máximo **5 intentos fallidos** por userId en una ventana de **15 minutos**.
Tras exceder el límite, se bloquea la funcionalidad hasta que transcurra el período.

## Sanitización
Los campos de contraseña se sanitizan antes del procesamiento:
- Se eliminan caracteres de control (U+0000–U+001F, U+007F–U+009F)
- Se recortan espacios en blanco al inicio y final
    `,
  })
  @ApiBody({
    type: ChangePasswordRequestDto,
    description: 'Contraseña actual y nueva contraseña del usuario.',
    examples: {
      'cambio-basico': {
        summary: 'Cambio de contraseña válido',
        description: 'Ejemplo con contraseña actual correcta y nueva contraseña que cumple todos los requisitos de seguridad.',
        value: {
          currentPassword: 'MiPassActual123!',
          newPassword: 'NuevaSegura456@',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente.',
    type: ChangePasswordSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validación fallida, contraseña actual incorrecta o nueva contraseña igual a la actual.',
    type: ChangePasswordBadRequestResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token JWT inválido, expirado o ausente.',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit excedido (5 intentos fallidos en 15 minutos).',
    type: ChangePasswordRateLimitResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
    type: InternalErrorResponseDto,
  })
  async changePassword(
    @Body() dto: ChangePasswordRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = (req as any).user;
    const sanitizedCurrentPassword = sanitizePasswordInput(dto.currentPassword);
    const sanitizedNewPassword = sanitizePasswordInput(dto.newPassword);

    await this.changePasswordNestService.changePassword(
      user.userId,
      sanitizedCurrentPassword,
      sanitizedNewPassword,
    );

    res.status(HttpStatus.OK);
    return { success: true, message: 'Contraseña actualizada exitosamente' };
  }

  // ─── POST /auth/forgot-password ──────────────────────────────────────────

  @Post('forgot-password')
  @SkipEmailVerification()
  @UseFilters(AuthExceptionFilter)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Solicitar restablecimiento de contraseña',
    description: `
Envía un email con enlace de restablecimiento si el email está registrado en el sistema.

## Flujo
1. Normaliza el email (trim + toLowerCase)
2. Verifica rate limit por email (máx 3 solicitudes por hora)
3. Busca el usuario por email en la base de datos
4. Si existe: invalida tokens previos, genera nuevo token (256 bits), encola email con enlace de reset
5. Retorna siempre el mismo mensaje genérico (no revela si el email existe)

## Seguridad
- **Endpoint público**: no requiere autenticación JWT.
- **Respuesta genérica invariante**: siempre retorna HTTP 200 con el mismo mensaje, independientemente de si el email existe, no existe, o se excedió el rate limit.
- **No enumerable**: el tiempo de respuesta no varía significativamente entre emails existentes y no existentes.
- **Token seguro**: generado con \`crypto.randomBytes(32)\` (256 bits de entropía), expira en 1 hora.

## Rate Limiting
Máximo **3 solicitudes** por email en una ventana de **1 hora**.
Si se excede el límite, se retorna el mismo mensaje genérico (el rate limit no es detectable por el cliente).
    `,
  })
  @ApiBody({
    type: ForgotPasswordRequestDto,
    description: 'Email de la cuenta para la cual se solicita el restablecimiento.',
    examples: {
      'solicitud-basica': {
        summary: 'Solicitud de restablecimiento',
        description: 'Envía solicitud de reset para un email registrado.',
        value: {
          email: 'usuario@empresa.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje genérico enviado. No revela si el email existe en el sistema ni si se aplicó rate limiting.',
    type: ForgotPasswordSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email con formato inválido (validación de class-validator).',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor al procesar la solicitud.',
    type: InternalErrorResponseDto,
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const email = dto.email.trim().toLowerCase();
    await this.forgotPasswordNestService.execute(email);
    res.status(HttpStatus.OK);
    return { message: 'Si el email está registrado, recibirás un correo con instrucciones' };
  }

  // ─── POST /auth/reset-password ───────────────────────────────────────────

  @Post('reset-password')
  @SkipEmailVerification()
  @UseFilters(AuthExceptionFilter)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Restablecer contraseña con token',
    description: `
Valida el token de restablecimiento y actualiza la contraseña del usuario.

## Flujo de Validación del Token
1. Busca el token en la colección \`verifyTokens\` por valor y tipo \`password_reset\`
2. Verifica que el token existe → si no: error TOKEN_INVALID
3. Verifica que no ha sido usado (\`usedAt === null\`) → si ya fue usado: error TOKEN_ALREADY_USED
4. Verifica que no ha expirado (\`expiresAt > now\`) → si expiró: error TOKEN_EXPIRED
5. Valida la nueva contraseña contra los requisitos de seguridad → si falla: error VALIDATION_FAILED
6. Genera hash bcrypt (cost factor 12) y actualiza la contraseña del usuario
7. Marca el token como usado (operación atómica: si falla el update de contraseña, el token NO se marca)

## Seguridad
- **Endpoint público**: no requiere autenticación JWT.
- **Token de un solo uso**: una vez usado, no puede reutilizarse.
- **Sanitización**: la nueva contraseña se sanitiza eliminando caracteres de control (U+0000–U+001F, U+007F–U+009F) y recortando espacios.
- **Atomicidad**: si la actualización del hash falla, el token permanece sin usar (disponible para reintento).
- **Máximo 128 caracteres** para la nueva contraseña.

## Requisitos de la Nueva Contraseña
- Mínimo 8 caracteres
- Al menos una letra mayúscula
- Al menos una letra minúscula
- Al menos un dígito
- Al menos un carácter especial
- Máximo 128 caracteres
    `,
  })
  @ApiBody({
    type: ResetPasswordRequestDto,
    description: 'Token de restablecimiento y nueva contraseña.',
    examples: {
      'reset-valido': {
        summary: 'Restablecimiento válido',
        description: 'Token válido con nueva contraseña que cumple todos los requisitos de seguridad.',
        value: {
          token: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          newPassword: 'NuevaSegura456@',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente. El token queda marcado como usado.',
    type: ResetPasswordSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: `Error de validación. Posibles códigos de error:
- **TOKEN_INVALID**: El token no existe o el usuario asociado no fue encontrado.
- **TOKEN_EXPIRED**: El token ha expirado (más de 1 hora desde su generación).
- **TOKEN_ALREADY_USED**: El token ya fue utilizado previamente.
- **VALIDATION_FAILED**: La nueva contraseña no cumple los requisitos de seguridad.`,
    type: ResetPasswordBadRequestResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor. El token NO se marca como usado si la actualización falla.',
    type: InternalErrorResponseDto,
  })
  async resetPassword(
    @Body() dto: ResetPasswordRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sanitizedPassword = sanitizePasswordInput(dto.newPassword);
    await this.resetPasswordNestService.execute(dto.token, sanitizedPassword);
    res.status(HttpStatus.OK);
    return { success: true, message: 'Contraseña restablecida exitosamente' };
  }
}
