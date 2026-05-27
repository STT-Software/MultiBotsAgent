import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { CompanyRepository, ChannelRepository } from '@multibotagents/db';
import { ChannelsController } from './channels.controller';
import { ConnectWhatsAppService } from './services/connect-whatsapp.service';
import { MetaGraphApiProvider } from './providers/meta-graph-api.provider';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Módulo de canales de WhatsApp.
 *
 * Gestiona la conexión de números de WhatsApp a agentes de la plataforma
 * mediante el flujo de Embedded Signup de Meta.
 */
@Module({
  controllers: [ChannelsController],
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
      provide: 'CHANNEL_REPO',
      useFactory: (client: MongoClient) => new ChannelRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'CONNECT_WHATSAPP_SERVICE',
      useClass: ConnectWhatsAppService,
    },
    ConnectWhatsAppService,
    MetaGraphApiProvider,
    JwtAuthGuard,
  ],
})
export class ChannelsModule {}
