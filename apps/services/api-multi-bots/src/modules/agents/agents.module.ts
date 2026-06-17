import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { AgentRepository, CompanyRepository } from '@multibotagents/db';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Módulo NestJS para la gestión de agentes.
 * Registra el controlador, el servicio y los proveedores de base de datos.
 */
@Module({
  controllers: [AgentsController],
  providers: [
    // ─── MongoDB Client ────────────────────────────────────────────────────────
    {
      provide: 'AGENT_MONGO_CLIENT',
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI es requerida para AgentsModule');
        return new MongoClient(uri);
      },
    },

    // ─── Repositorios ──────────────────────────────────────────────────────────
    {
      provide: 'AGENT_REPO',
      useFactory: (client: MongoClient) => new AgentRepository(client.db()),
      inject: ['AGENT_MONGO_CLIENT'],
    },
    {
      provide: 'COMPANY_REPO',
      useFactory: (client: MongoClient) => new CompanyRepository(client.db()),
      inject: ['AGENT_MONGO_CLIENT'],
    },

    // ─── Servicios ─────────────────────────────────────────────────────────────
    AgentsService,
    JwtAuthGuard,
  ],
  exports: [AgentsService],
})
export class AgentsModule {}
