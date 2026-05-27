import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { CompanyRepository, EscalatedConversationRepository } from '@multibotagents/db';
import { EscalamientoController } from './escalamiento.controller';
import { EscalamientoService } from './escalamiento.service';

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
    EscalamientoService,
  ],
})
export class EscalamientoModule {}
