import { Injectable, Inject, Logger } from '@nestjs/common';
import { RefreshService, TokenService } from '@multibotagents/core';
import type {
  UserRepository,
  CompanyRepository,
  RefreshTokenRepository,
} from '@multibotagents/db';
import type { RefreshResult, IRefreshTokenLookupRepository } from '@multibotagents/core';
import type { RefreshToken } from '@multibotagents/types';

/**
 * Adaptador que envuelve RefreshTokenRepository para cumplir con la interfaz
 * IRefreshTokenLookupRepository (findByToken).
 */
class RefreshTokenLookupAdapter implements IRefreshTokenLookupRepository {
  constructor(private readonly repo: RefreshTokenRepository) {}

  async findByToken(token: string): Promise<RefreshToken | null> {
    const all = await this.repo.findAll({ token });
    return all.length > 0 ? all[0] : null;
  }
}

@Injectable()
export class RefreshNestService {
  private readonly coreService: RefreshService;
  private readonly logger = new Logger(RefreshNestService.name);

  constructor(
    @Inject('USER_REPO') userRepository: UserRepository,
    @Inject('COMPANY_REPO') companyRepository: CompanyRepository,
    @Inject('REFRESH_TOKEN_REPO') refreshTokenRepository: RefreshTokenRepository,
  ) {
    const jwtSecrets = (process.env.JWT_SECRETS || '').split(',').filter(Boolean);
    this.logger.log(`JWT secrets configured: ${jwtSecrets.length} key(s)`);
    const tokenService = new TokenService({ secrets: jwtSecrets });

    const refreshTokenLookupAdapter = new RefreshTokenLookupAdapter(refreshTokenRepository);

    this.coreService = new RefreshService({
      refreshTokenRepository: refreshTokenLookupAdapter,
      userRepository,
      companyRepository,
      tokenService,
    });

    this.logger.log('RefreshService initialized successfully');
  }

  /**
   * Renueva el access token usando un refresh token válido.
   *
   * @param refreshTokenValue - Valor del refresh token (leído de la cookie httpOnly)
   * @returns Nuevo access token
   */
  async refresh(refreshTokenValue: string): Promise<RefreshResult> {
    return this.coreService.refresh(refreshTokenValue);
  }
}
