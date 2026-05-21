import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import {
  KnowledgeSourceRepository,
  KnowledgeFragmentRepository,
} from '@multibotagents/db';

import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import {
  KNOWLEDGE_SOURCE_REPOSITORY,
  KNOWLEDGE_FRAGMENT_REPOSITORY,
  S3_CLIENT,
  SQS_CLIENT,
} from './constants';

/**
 * Módulo NestJS para la gestión de la base de conocimiento.
 * Registra controller, service y providers (repositorios, S3Client, SQSClient).
 *
 * Patrón de inyección:
 * - MongoClient se crea con la URI de entorno y se usa como factory para los repos.
 * - S3Client y SQSClient se crean con la región de entorno (default: us-east-1).
 * - Los repositorios reciben la instancia Db del MongoClient.
 */
@Module({
  controllers: [KnowledgeController],
  providers: [
    // ─── MongoDB Client ────────────────────────────────────────────────────────
    {
      provide: 'KNOWLEDGE_MONGO_CLIENT',
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI es requerida para KnowledgeModule');
        return new MongoClient(uri);
      },
    },

    // ─── Repositorios ──────────────────────────────────────────────────────────
    {
      provide: KNOWLEDGE_SOURCE_REPOSITORY,
      useFactory: (client: MongoClient) => new KnowledgeSourceRepository(client.db()),
      inject: ['KNOWLEDGE_MONGO_CLIENT'],
    },
    {
      provide: KNOWLEDGE_FRAGMENT_REPOSITORY,
      useFactory: (client: MongoClient) => new KnowledgeFragmentRepository(client.db()),
      inject: ['KNOWLEDGE_MONGO_CLIENT'],
    },

    // ─── Clientes AWS ──────────────────────────────────────────────────────────
    {
      provide: S3_CLIENT,
      useFactory: () => {
        const region = process.env.AWS_REGION ?? 'us-east-1';
        return new S3Client({ region });
      },
    },
    {
      provide: SQS_CLIENT,
      useFactory: () => {
        const region = process.env.AWS_REGION ?? 'us-east-1';
        return new SQSClient({ region });
      },
    },

    // ─── Servicio principal ────────────────────────────────────────────────────
    KnowledgeService,
  ],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
