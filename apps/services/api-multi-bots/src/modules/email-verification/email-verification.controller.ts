import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  HttpStatus,
  UseFilters,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { EmailVerificationNestService } from './email-verification-nest.service';
import { EmailVerificationExceptionFilter } from './filters/email-verification-exception.filter';
import { SkipEmailVerification } from './decorators/skip-email-verification.decorator';
import {
  ResendVerificationBodyDto,
  VerifyEmailSuccessResponseDto,
  ResendVerificationSuccessResponseDto,
  EmailVerificationErrorResponseDto,
} from './dto';

/**
 * Controller de verificación de email.
 * Expone endpoints bajo el prefijo /auth/ para verificar tokens y reenviar emails.
 *
 * Validates: Requirements 4.1, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 5.8
 */
@ApiTags('Auth')
@Controller('auth')
@UseFilters(EmailVerificationExceptionFilter)
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationNestService,
  ) {}

  // ─── GET /auth/verify-email ────────────────────────────────────────────────

  @Get('verify-email')
  @SkipEmailVerification()
  @ApiOperation({
    summary: 'Verificar email con token',
    description: `
Valida un token de verificación de email y marca el email del usuario como verificado.
El token es de **un solo uso** y expira a las 24 horas de su creación.

## Flujo
1. Valida formato del token (cadena hexadecimal de exactamente 64 caracteres)
2. Busca el token en BD y lo marca como usado atómicamente (\`findOneAndUpdate\`)
3. Si el token no existe, ya fue usado o expiró, retorna el error correspondiente
4. Marca el campo \`emailVerified\` del usuario como \`true\`
5. Retorna confirmación con indicador de sesión activa (para decidir redirect en frontend)

## Autenticación
Este endpoint es **público** (no requiere autenticación).
El token de verificación actúa como credencial de un solo uso.

## Notas
- El token se genera con \`crypto.randomBytes(32)\` (256 bits de entropía)
- La operación de marcado es atómica: solo una invocación concurrente puede consumir el token
- Tokens expirados son eliminados automáticamente por TTL index de MongoDB
    `,
  })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
    description: 'Token de verificación de email (64 caracteres hexadecimales, un solo uso)',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verificado exitosamente. El usuario puede acceder a rutas protegidas.',
    type: VerifyEmailSuccessResponseDto,
    examples: {
      'con-sesion': {
        summary: 'Usuario con sesión activa (redirect a dashboard)',
        value: {
          verified: true,
          message: 'Email verificado exitosamente',
          hasActiveSession: true,
        },
      },
      'sin-sesion': {
        summary: 'Usuario sin sesión activa (redirect a login)',
        value: {
          verified: true,
          message: 'Email verificado exitosamente',
          hasActiveSession: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado o ya utilizado.',
    type: EmailVerificationErrorResponseDto,
    examples: {
      'token-invalido': {
        summary: 'Token con formato inválido o inexistente',
        value: {
          error: 'TOKEN_INVALID',
          message: 'El link de verificación no es válido',
        },
      },
      'token-usado': {
        summary: 'Token ya fue utilizado previamente',
        value: {
          error: 'TOKEN_ALREADY_USED',
          message: 'El link ya fue utilizado',
        },
      },
      'token-expirado': {
        summary: 'Token expirado (más de 24 horas)',
        value: {
          error: 'TOKEN_EXPIRED',
          message: 'El link de verificación expiró',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'INTERNAL_ERROR' },
        message: { type: 'string', example: 'Error temporal, intenta nuevamente' },
      },
    },
  })
  async verifyEmail(
    @Query('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.emailVerificationService.verifyToken(token);

    // Determine if user has an active session (check Authorization header)
    const hasActiveSession = !!req.headers.authorization;

    res.status(HttpStatus.OK);
    return {
      verified: true,
      message: 'Email verificado exitosamente',
      hasActiveSession,
    };
  }

  // ─── POST /auth/resend-verification ────────────────────────────────────────

  @Post('resend-verification')
  @SkipEmailVerification()
  @ApiOperation({
    summary: 'Reenviar email de verificación',
    description: `
Reenvía el email de verificación al usuario. Invalida todos los tokens previos y genera uno nuevo.

## Flujo
1. Identifica al usuario por JWT (Authorization header) o por \`expiredToken\` (body)
2. Verifica que el email no esté ya verificado
3. Verifica que no haya cooldown activo (60 segundos entre reenvíos)
4. Invalida todos los tokens de verificación previos del usuario
5. Genera un nuevo token con expiración de 24 horas
6. Encola el email de verificación para envío asíncrono
7. Retorna confirmación con email parcialmente oculto

## Autenticación
- **Con JWT (Bearer token)**: Extrae \`userId\` del access token. Método preferido para usuarios con sesión activa.
- **Con expiredToken (body)**: Identifica al usuario a partir de un token expirado. Útil cuando el usuario no tiene sesión activa (ej: link expirado en email).
- Al menos uno de los dos mecanismos debe estar presente.

## Rate Limiting
- Cooldown de **60 segundos** entre reenvíos por usuario.
- Si se intenta reenviar antes del cooldown, se retorna HTTP 429 con el campo \`retryAfter\` indicando los segundos restantes.
- El cooldown se calcula desde el \`createdAt\` del último token generado para el usuario.
    `,
  })
  @ApiBearerAuth('access-token')
  @ApiBody({
    type: ResendVerificationBodyDto,
    description: 'Parámetros de reenvío. El `expiredToken` es opcional si se provee JWT en el header Authorization.',
    examples: {
      'con-token-expirado': {
        summary: 'Reenvío usando token expirado (sin sesión)',
        value: {
          expiredToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        },
      },
      'con-jwt': {
        summary: 'Reenvío usando JWT (con sesión activa, body vacío)',
        value: {},
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email de verificación reenviado exitosamente.',
    type: ResendVerificationSuccessResponseDto,
    examples: {
      'reenvio-exitoso': {
        summary: 'Reenvío exitoso',
        value: {
          success: true,
          message: 'Email de verificación reenviado',
          email: 'u***@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Email ya verificado.',
    type: EmailVerificationErrorResponseDto,
    examples: {
      'ya-verificado': {
        summary: 'El email ya fue verificado previamente',
        value: {
          error: 'ALREADY_VERIFIED',
          message: 'El email ya está verificado',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado y sin expiredToken válido.',
    type: EmailVerificationErrorResponseDto,
    examples: {
      'sin-auth': {
        summary: 'Sin JWT ni token expirado',
        value: {
          error: 'UNAUTHORIZED',
          message: 'Se requiere autenticación o token expirado',
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Cooldown activo. Debe esperar antes de reenviar.',
    type: EmailVerificationErrorResponseDto,
    examples: {
      'cooldown-activo': {
        summary: 'Cooldown de 60 segundos activo (retryAfter indica segundos restantes)',
        value: {
          error: 'RESEND_COOLDOWN',
          message: 'Espera 45 segundos antes de reenviar',
          retryAfter: 45,
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor.',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'INTERNAL_ERROR' },
        message: { type: 'string', example: 'Error temporal, intenta nuevamente' },
      },
    },
  })
  async resendVerification(
    @Body() body: ResendVerificationBodyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Try to extract userId from JWT (optional auth)
    const userId = this.extractUserIdFromRequest(req);
    const { expiredToken } = body;

    // Must have either userId (from JWT) or expiredToken
    if (!userId && !expiredToken) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Se requiere autenticación o token expirado',
      });
    }

    const result = await this.emailVerificationService.resendVerification({
      userId: userId || undefined,
      expiredToken: expiredToken || undefined,
    });

    // Mask email for response (u***@example.com)
    const maskedEmail = this.maskEmail(result.email);

    res.status(HttpStatus.OK);
    return {
      success: true,
      message: 'Email de verificación reenviado',
      email: maskedEmail,
    };
  }

  /**
   * Extracts userId from JWT in Authorization header if present.
   * Does NOT throw if absent — allows fallback to expiredToken.
   */
  private extractUserIdFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    // If user was already attached by a guard or middleware
    const user = (req as any).user;
    if (user?.userId) {
      return user.userId;
    }

    // Try to decode JWT manually (without full guard validation)
    try {
      const token = authHeader.substring(7);
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      return payload.userId || null;
    } catch {
      return null;
    }
  }

  /**
   * Masks an email address for display (e.g., "user@example.com" → "u***@example.com").
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const masked = local.length > 1
      ? `${local[0]}***`
      : `${local}***`;
    return `${masked}@${domain}`;
  }
}
