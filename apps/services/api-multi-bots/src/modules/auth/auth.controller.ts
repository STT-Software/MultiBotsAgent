import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpStatus,
  UseGuards,
  UseFilters,
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
import type { RegisterDto, LoginDto } from '@multibotagents/types';
import {
  ValidationError,
  CaptchaError,
  DuplicateEmailError,
  ConcurrencyConflictError,
  TokenExpiredError,
} from '@multibotagents/types';
import { RegisterNestService } from './register.service';
import { LoginNestService } from './login.service';
import { RefreshNestService } from './refresh.service';
import { LogoutNestService } from './logout.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthExceptionFilter } from './filters/auth-exception.filter';
import {
  RegisterRequestDto,
  RegisterSuccessResponseDto,
  ValidationErrorResponseDto,
  CaptchaErrorResponseDto,
  ConflictErrorResponseDto,
  InternalErrorResponseDto,
} from './dto';

/** Cookie configuration for refresh token (7 days in ms). */
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/auth/refresh',
  maxAge: 604800000,
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly registerService: RegisterNestService,
    private readonly loginService: LoginNestService,
    private readonly refreshService: RefreshNestService,
    private readonly logoutService: LogoutNestService,
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
    @Body() dto: LoginDto,
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
}
