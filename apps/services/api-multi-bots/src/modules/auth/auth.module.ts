import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import {
  CompanyRepository,
  UserRepository,
  RefreshTokenRepository,
  VerifyTokenRepository,
  EmailQueueRepository,
} from '@multibotagents/db';
import { RegisterNestService } from './register.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
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
      provide: 'COMPANY_REPO',
      useFactory: (client: MongoClient) => new CompanyRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'USER_REPO',
      useFactory: (client: MongoClient) => new UserRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'REFRESH_TOKEN_REPO',
      useFactory: (client: MongoClient) => new RefreshTokenRepository(client.db()),
      inject: ['MONGO_CLIENT'],
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
    RegisterNestService,
  ],
})
export class AuthModule {}
