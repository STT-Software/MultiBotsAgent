import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SKIP_EMAIL_VERIFICATION_KEY } from '../decorators/skip-email-verification.decorator';

/**
 * Guard que verifica el claim `emailVerified` del JWT decodificado.
 *
 * Flujo:
 * 1. Verifica si el handler tiene el decorador @SkipEmailVerification()
 * 2. Si tiene el decorador, permite el acceso sin verificar
 * 3. Si no hay usuario en el request (endpoint no autenticado), permite el acceso
 *    (otros guards se encargan de la autenticación)
 * 4. Si emailVerified === false, lanza ForbiddenException con error EMAIL_NOT_VERIFIED
 * 5. Si emailVerified === true, permite el acceso
 *
 * Errores:
 * - 403 ForbiddenException con { error: 'EMAIL_NOT_VERIFIED' } si email no verificado
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

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
    const user = (request as any).user;

    // 3. If no user on request (unauthenticated endpoint), let other guards handle auth
    if (!user) {
      return true;
    }

    // 4. If emailVerified is false, block access
    if (user.emailVerified === false) {
      throw new ForbiddenException({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Se requiere verificación de email',
      });
    }

    // 5. If emailVerified is true (or not present), allow access
    return true;
  }
}
