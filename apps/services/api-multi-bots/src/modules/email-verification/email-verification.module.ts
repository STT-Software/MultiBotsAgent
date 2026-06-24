import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongoClient } from 'mongodb';
import {
  VerifyTokenRepository,
  EmailQueueRepository,
  UserRepository,
} from '@multibotagents/db';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationNestService } from './email-verification-nest.service';
import { EmailWorkerCronService } from './email-worker-cron.service';
import { EmailVerifiedGuard } from './guards/email-verified.guard';

/**
 * Módulo NestJS de verificación de email.
 *
 * Registra providers:
 * - MONGO_CLIENT: conexión MongoDB
 * - VERIFY_TOKEN_REPO: repositorio de tokens de verificación
 * - EMAIL_QUEUE_REPO: repositorio de cola de emails
 * - USER_REPO: repositorio de usuarios
 * - EmailVerificationNestService: wrapper del core EmailVerificationService
 *
 * Validates: Requirements 4.1, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 5.8
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [EmailVerificationController],
  providers: [
    {
      provide: 'MONGO_CLIENT',
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is required');
        return new MongoClient(uri);
      },
    },
    {
      provide: 'VERIFY_TOKEN_REPO',
      useFactory: (client: MongoClient) => new VerifyTokenRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'EMAIL_QUEUE_REPO',
      useFactory: (client: MongoClient) => new EmailQueueRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'USER_REPO',
      useFactory: (client: MongoClient) => new UserRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    EmailVerificationNestService,
    EmailVerifiedGuard,
    {
      provide: EmailWorkerCronService,
      useFactory: (client: MongoClient) => new EmailWorkerCronService(client),
      inject: ['MONGO_CLIENT'],
    },
  ],
  exports: [EmailVerificationNestService, EmailVerifiedGuard],
})
export class EmailVerificationModule {}
