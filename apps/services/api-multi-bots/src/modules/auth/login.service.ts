import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  LoginService,
  PasswordService,
  TokenService,
  RateLimitService,
} from '@multibotagents/core';
import type {
  UserRepository,
  CompanyRepository,
  RefreshTokenRepository,
  RateLimitRepository,
} from '@multibotagents/db';
import type { LoginResult } from '@multibotagents/types';
import { InvalidCredentialsError } from '@multibotagents/types';
import type { ILoginRefreshTokenRepository } from '@multibotagents/core';

/**
 * Adaptador que envuelve RefreshTokenRepository para cumplir con la interfaz
 * ILoginRefreshTokenRepository (sin sesión de transacción).
 */
class LoginRefreshTokenAdapter implements ILoginRefreshTokenRepository {
  constructor(private readonly repo: RefreshTokenRepository) {}

  async revokeAllByUserId(userId: string): Promise<void> {
    // The existing repo requires a ClientSession, but LoginService operates
    // without transactions. We call updateMany directly via the repo's findAll + update pattern.
    // Since the repo's revokeAllByUserId requires a session, we use the generic update approach.
    const tokens = await this.repo.findAll({ userId, revoked: false });
    await Promise.all(
      tokens.map((t) => this.repo.update(t.id, { revoked: true })),
    );
  }

  async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
  }): Promise<{ id: string }> {
    const result = await this.repo.create({
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      revoked: data.revoked,
      createdAt: data.createdAt,
    });
    return { id: result.id };
  }
}

@Injectable()
export class LoginNestService {
  private readonly coreService: LoginService;
  private readonly rateLimitService: RateLimitService;
  private readonly logger = new Logger(LoginNestService.name);

  constructor(
    @Inject('USER_REPO') userRepository: UserRepository,
    @Inject('COMPANY_REPO') companyRepository: CompanyRepository,
    @Inject('REFRESH_TOKEN_REPO') refreshTokenRepository: RefreshTokenRepository,
    @Inject('RATE_LIMIT_REPO') rateLimitRepository: RateLimitRepository,
  ) {
    const passwordService = new PasswordService();

    const jwtSecrets = (process.env.JWT_SECRETS || '').split(',').filter(Boolean);
    this.logger.log(`JWT secrets configured: ${jwtSecrets.length} key(s)`);
    const tokenService = new TokenService({ secrets: jwtSecrets });

    this.rateLimitService = new RateLimitService(rateLimitRepository);

    const refreshTokenAdapter = new LoginRefreshTokenAdapter(refreshTokenRepository);

    // Adapt userRepository.update to match ILoginUserRepository (returns void instead of User)
    const loginUserRepository = {
      findByEmail: (email: string) => userRepository.findByEmail(email),
      update: async (id: string, data: Partial<any>) => {
        await userRepository.update(id, data);
      },
    };

    this.coreService = new LoginService({
      userRepository: loginUserRepository,
      companyRepository,
      refreshTokenRepository: refreshTokenAdapter,
      passwordService,
      tokenService,
    });

    this.logger.log('LoginService initialized successfully');
  }

  /**
   * Ejecuta el flujo de login con rate limiting.
   *
   * @param email - Email del usuario
   * @param password - Contraseña en texto plano
   * @param ip - Dirección IP del request
   * @returns Resultado con access token, refresh token y datos del usuario
   */
  async login(email: string, password: string, ip: string): Promise<LoginResult> {
    // 1. Check rate limit before attempting login
    await this.rateLimitService.checkRateLimit(ip, email);

    try {
      // 2. Attempt login
      const result = await this.coreService.login(email, password);

      // 3. On success, reset email rate limit counter
      await this.rateLimitService.resetAttempts(email);

      return result;
    } catch (error) {
      // 4. On InvalidCredentialsError, record failed attempt
      if (error instanceof InvalidCredentialsError) {
        await this.rateLimitService.recordFailedAttempt(ip, email);
      }
      throw error;
    }
  }
}
