import { Injectable, Inject, Logger } from '@nestjs/common';
import { LogoutService } from '@multibotagents/core';
import type { RefreshTokenRepository } from '@multibotagents/db';
import type { ILogoutRefreshTokenRepository } from '@multibotagents/core';

/**
 * Adaptador que envuelve RefreshTokenRepository para cumplir con la interfaz
 * ILogoutRefreshTokenRepository (revokeAllByUserId sin sesión).
 */
class LogoutRefreshTokenAdapter implements ILogoutRefreshTokenRepository {
  constructor(private readonly repo: RefreshTokenRepository) {}

  async revokeAllByUserId(userId: string): Promise<void> {
    const tokens = await this.repo.findAll({ userId, revoked: false });
    await Promise.all(
      tokens.map((t) => this.repo.update(t.id, { revoked: true })),
    );
  }
}

@Injectable()
export class LogoutNestService {
  private readonly coreService: LogoutService;
  private readonly logger = new Logger(LogoutNestService.name);

  constructor(
    @Inject('REFRESH_TOKEN_REPO') refreshTokenRepository: RefreshTokenRepository,
  ) {
    const refreshTokenAdapter = new LogoutRefreshTokenAdapter(refreshTokenRepository);

    this.coreService = new LogoutService({
      refreshTokenRepository: refreshTokenAdapter,
    });

    this.logger.log('LogoutService initialized successfully');
  }

  /**
   * Cierra la sesión del usuario revocando todos sus refresh tokens activos.
   *
   * @param userId - ID del usuario que cierra sesión
   */
  async logout(userId: string): Promise<void> {
    return this.coreService.logout(userId);
  }
}
