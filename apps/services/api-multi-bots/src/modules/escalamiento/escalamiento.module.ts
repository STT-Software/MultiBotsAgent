import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { SQSClient } from '@aws-sdk/client-sqs';
import { CompanyRepository, EscalatedConversationRepository, EscalationEventRepository, S3StorageService, ChannelRepository } from '@multibotagents/db';
import { EscalamientoController } from './escalamiento.controller';
import { EscalamientoService } from './escalamiento.service';
import { EscalamientoStorageService } from './escalamiento-storage.service';
import { EscalamientoCronService } from './escalamiento-cron.service';

@Module({
  controllers: [EscalamientoController],
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
      provide: 'ESCALATED_CONVERSATION_REPO',
      useFactory: (client: MongoClient) => new EscalatedConversationRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'CHANNEL_REPO',
      useFactory: (client: MongoClient) => new ChannelRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'SQS_CLIENT',
      useFactory: () => {
        const region = process.env.AWS_REGION || 'us-east-1';
        return new SQSClient({ region });
      },
    },
    {
      provide: 'ESCALAMIENTO_STORAGE',
      useFactory: () => {
        const bucket = process.env.ESCALAMIENTO_FILES_BUCKET || process.env.COMPANY_LOGOS_BUCKET;
        const region = process.env.ESCALAMIENTO_FILES_REGION || process.env.COMPANY_LOGOS_REGION || 'us-east-1';
        if (!bucket) throw new Error('ESCALAMIENTO_FILES_BUCKET or COMPANY_LOGOS_BUCKET is required');
        return new S3StorageService({ bucket, region });
      },
    },
    {
      provide: 'ESCALATION_EVENT_REPO',
      useFactory: (client: MongoClient) => new EscalationEventRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'MONGO_DB',
      useFactory: (client: MongoClient) => client.db(),
      inject: ['MONGO_CLIENT'],
    },
    EscalamientoService,
    EscalamientoStorageService,
    EscalamientoCronService,
  ],
})
export class EscalamientoModule {}
