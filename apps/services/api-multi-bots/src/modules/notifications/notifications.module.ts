import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { EmailQueueRepository, UserRepository, CompanyRepository } from '@multibotagents/db';
import { NotificationsWsGateway } from './notifications-ws.gateway';
import { NotificationsWsEmitterProvider } from './providers/notifications-ws-emitter.provider';
import { NotificationsService } from './notifications.service';

/**
 * Módulo de Notificaciones de NestJS.
 * Agrupa la infraestructura de WebSockets, proveedores de BD y servicios.
 */
@Module({
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
      provide: 'EMAIL_QUEUE_REPO',
      useFactory: (client: MongoClient) => new EmailQueueRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'USER_REPO',
      useFactory: (client: MongoClient) => new UserRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'COMPANY_REPO', // Requerido por WsJwtGuard en el Gateway
      useFactory: (client: MongoClient) => new CompanyRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    NotificationsWsGateway,
    NotificationsWsEmitterProvider,
    NotificationsService,
  ],
  exports: [NotificationsService, NotificationsWsGateway],
})
export class NotificationsModule {}
