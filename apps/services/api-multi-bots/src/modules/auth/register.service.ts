import { Injectable, Inject, Logger } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import {
  RegisterService,
  PasswordService,
  TokenService,
  CaptchaService,
} from '@multibotagents/core';
import type {
  CompanyRepository,
  UserRepository,
  RefreshTokenRepository,
  VerifyTokenRepository,
  EmailQueueRepository,
} from '@multibotagents/db';
import type { RegisterDto, RegisterResult } from '@multibotagents/types';

@Injectable()
export class RegisterNestService {
  private readonly coreService: RegisterService;
  private readonly logger = new Logger(RegisterNestService.name);

  constructor(
    @Inject('MONGO_CLIENT') private readonly mongoClient: MongoClient,
    @Inject('USER_REPO') userRepository: UserRepository,
    @Inject('COMPANY_REPO') companyRepository: CompanyRepository,
    @Inject('REFRESH_TOKEN_REPO') refreshTokenRepository: RefreshTokenRepository,
    @Inject('VERIFY_TOKEN_REPO') verifyTokenRepository: VerifyTokenRepository,
    @Inject('EMAIL_QUEUE_REPO') emailQueueRepository: EmailQueueRepository,
  ) {
    const passwordService = new PasswordService();

    const jwtSecrets = (process.env.JWT_SECRETS || '').split(',').filter(Boolean);
    this.logger.log(`JWT secrets configured: ${jwtSecrets.length} key(s)`);
    const tokenService = new TokenService({ secrets: jwtSecrets });

    const captchaService = new CaptchaService({
      verifyUrl: process.env.CAPTCHA_VERIFY_URL || undefined,
      secret: process.env.CAPTCHA_SECRET || undefined,
    });

    try {
      this.coreService = new RegisterService({
        userRepository,
        companyRepository,
        refreshTokenRepository,
        verifyTokenRepository,
        emailQueueRepository,
        passwordService,
        tokenService,
        captchaService,
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
      });
      this.logger.log('RegisterService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RegisterService', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  async register(dto: RegisterDto): Promise<RegisterResult> {
    return this.coreService.register(dto);
  }
}
