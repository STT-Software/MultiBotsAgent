import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { TokenService } from '@multibotagents/core';
import { SKIP_EMAIL_VERIFICATION_KEY } from '../decorators/skip-email-verification.decorator';

/**
 * Guard que verifica el claim `emailVerified` del JWT decodificado.
 *
 * Flujo:
 * 1. Verifica si el handler tiene el decorador @SkipEmailVerification()
 * 2. Si tiene el decorador, permite el acceso sin verificar
 * 3. Si no hay usuario en el request, intenta decodificar el JWT de forma no invasiva
 * 4. Si no se puede extraer usuario (endpoint público real), permite el acceso
 * 5. Si emailVerified === false, lanza ForbiddenException con error EMAIL_NOT_VERIFIED
 * 6. Si emailVerified === true, permite el acceso
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  private readonly tokenService: TokenService;

  constructor(private readonly reflector: Reflector) {
    const jwtSecrets = (process.env.JWT_SECRETS || 'default_secret_for_tests').split(',').filter(Boolean);
    this.tokenService = new TokenService({ secrets: jwtSecrets });
  }

  canActivate(context: ExecutionContext): boolean {
    // 1. Check if handler or class has @SkipEmailVerification() metadata
    const skipVerification = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipVerification) {
      return true;
    }

    // 2. Get request and user from execution context
    const request = context.switchToHttp().getRequest<Request>();
    let user = (request as any).user;

    // 3. If no user on request (due to Guard ordering), try to decode JWT non-invasively
    if (!user) {
      const authHeader = request?.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          user = this.tokenService.verifyAccessToken(token);
        } catch {
          // Dejar que JwtAuthGuard maneje tokens inválidos o expirados
        }
      }
    }

    // 4. If still no user (unauthenticated public endpoint), let other guards handle auth
    if (!user) {
      return true;
    }

    // 5. If emailVerified is false, block access
    if (user.emailVerified === false) {
      throw new ForbiddenException({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Se requiere verificación de email',
      });
    }

    // 6. If emailVerified is true, allow access
    return true;
  }
}
