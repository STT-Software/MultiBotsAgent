import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { SQSClient } from '@aws-sdk/client-sqs';
import {
  OrderRepository,
  AgentRepository,
  UserRepository,
  ChannelRepository,
  EmailQueueRepository,
  CompanyRepository,
} from '@multibotagents/db';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ORDER_REPOSITORY } from './constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  controllers: [OrdersController],
  providers: [
    // ─── MongoDB Client ────────────────────────────────────────────────────────
    {
      provide: 'ORDERS_MONGO_CLIENT',
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI es requerida para OrdersModule');
        return new MongoClient(uri);
      },
    },

    // ─── Repositorios ──────────────────────────────────────────────────────────
    {
      provide: 'COMPANY_REPO',
      useFactory: (client: MongoClient) => new CompanyRepository(client.db()),
      inject: ['ORDERS_MONGO_CLIENT'],
    },
    {
      provide: ORDER_REPOSITORY,
      useFactory: (client: MongoClient) => new OrderRepository(client.db()),
      inject: ['ORDERS_MONGO_CLIENT'],
    },
    {
      provide: 'AGENT_REPO',
      useFactory: (client: MongoClient) => new AgentRepository(client.db()),
      inject: ['ORDERS_MONGO_CLIENT'],
    },
    {
      provide: 'USER_REPO',
      useFactory: (client: MongoClient) => new UserRepository(client.db()),
      inject: ['ORDERS_MONGO_CLIENT'],
    },
    {
      provide: 'CHANNEL_REPO',
      useFactory: (client: MongoClient) => new ChannelRepository(client.db()),
      inject: ['ORDERS_MONGO_CLIENT'],
    },
    {
      provide: 'EMAIL_QUEUE_REPO',
      useFactory: (client: MongoClient) => new EmailQueueRepository(client.db()),
      inject: ['ORDERS_MONGO_CLIENT'],
    },

    // ─── SQS Client ────────────────────────────────────────────────────────────
    {
      provide: 'SQS_CLIENT',
      useFactory: () => {
        const region = process.env.AWS_REGION || 'us-east-1';
        return new SQSClient({ region });
      },
    },

    // ─── Servicios ─────────────────────────────────────────────────────────────
    OrdersService,
    JwtAuthGuard,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
