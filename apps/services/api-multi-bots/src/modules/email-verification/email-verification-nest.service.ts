import { Injectable, Inject, Logger } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import {
  EmailVerificationService,
  EmailTokenService,
} from '@multibotagents/core/email-verification';
import type {
  VerifyTokenResult,
  ResendResult,
} from '@multibotagents/core/email-verification';
import type {
  VerifyTokenRepository,
  EmailQueueRepository,
  UserRepository,
} from '@multibotagents/db';

/**
 * NestJS wrapper service que instancia el core EmailVerificationService
 * con las dependencias inyectadas por el contenedor de NestJS.
 *
 * Validates: Requirements 4.1, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 5.8
 */
@Injectable()
export class EmailVerificationNestService {
  private readonly coreService: EmailVerificationService;
  private readonly logger = new Logger(EmailVerificationNestService.name);

  constructor(
    @Inject('MONGO_CLIENT') private readonly mongoClient: MongoClient,
    @Inject('VERIFY_TOKEN_REPO') verifyTokenRepository: VerifyTokenRepository,
    @Inject('EMAIL_QUEUE_REPO') emailQueueRepository: EmailQueueRepository,
    @Inject('USER_REPO') userRepository: UserRepository,
  ) {
    const tokenService = new EmailTokenService();

    const frontendDomain = process.env.FRONTEND_DOMAIN || 'http://localhost:3000';
    const tokenTtlMs = Number(process.env.TOKEN_TTL_MS) || 24 * 60 * 60 * 1000; // 24h
    const resendCooldownMs = Number(process.env.RESEND_COOLDOWN_MS) || 60_000; // 60s

    this.coreService = new EmailVerificationService({
      verifyTokenRepository: verifyTokenRepository as any,
      emailQueueRepository: emailQueueRepository as any,
      userRepository: userRepository as any,
      tokenService,
      getSession: async () => {
        await this.mongoClient.connect();
        return this.mongoClient.startSession();
      },
      logger: {
        info: (message: string, meta?: Record<string, unknown>) =>
          this.logger.log(message, meta),
        error: (message: string, meta?: Record<string, unknown>) =>
          this.logger.error(message, meta),
        warn: (message: string, meta?: Record<string, unknown>) =>
          this.logger.warn(message, meta),
      },
      config: {
        frontendDomain,
        tokenTtlMs,
        resendCooldownMs,
      },
    });

    this.logger.log('EmailVerificationService initialized successfully');
  }

  async verifyToken(token: string): Promise<VerifyTokenResult> {
    return this.coreService.verifyToken(token);
  }

  async resendVerification(params: {
    userId?: string;
    expiredToken?: string;
  }): Promise<ResendResult> {
    return this.coreService.resendVerification(params);
  }

  isEmailVerified(emailVerified: boolean): boolean {
    return this.coreService.isEmailVerified(emailVerified);
  }
}
