import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { TokenService } from '@multibotagents/core';
import type { CompanyRepository } from '@multibotagents/db';
import { CompanyStatus } from '@multibotagents/types';
import type { Request } from 'express';

/**
 * Guard que verifica el Access Token JWT y el estado de la empresa.
 *
 * Flujo:
 * 1. Extrae Bearer token del header Authorization
 * 2. Verifica con TokenService (soporta rotación de secrets)
 * 3. Verifica company.status === 'active' via CompanyRepository
 * 4. Adjunta payload al request (req.user)
 *
 * Errores:
 * - 401 UnauthorizedException si token inválido o ausente
 * - 403 ForbiddenException con código COMPANY_INACTIVE si empresa no activa
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly tokenService: TokenService;

  constructor(
    @Inject('COMPANY_REPO') private readonly companyRepository: CompanyRepository,
  ) {
    const jwtSecrets = (process.env.JWT_SECRETS || '').split(',').filter(Boolean);
    this.tokenService = new TokenService({ secrets: jwtSecrets });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Extract Bearer token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const token = authHeader.substring(7);

    // 2. Verify token with TokenService (supports secret rotation)
    let payload;
    try {
      payload = this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // 3. Check company status
    const company = await this.companyRepository.findById(payload.companyId);
    if (!company || company.status !== CompanyStatus.ACTIVE) {
      throw new ForbiddenException({
        code: 'COMPANY_INACTIVE',
        message: 'La empresa asociada a tu cuenta no está activa.',
      });
    }

    // 4. Attach payload to request
    (request as any).user = payload;

    return true;
  }
}
