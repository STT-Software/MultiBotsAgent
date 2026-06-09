import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { MetricEventRepository, CompanyRepository } from '@multibotagents/db';
import { MetricasListenerService } from './metricas-listener.service';
import { MetricasWsGateway } from './metricas-ws.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { MetricasSeedService } from './metricas-seed.service';
import { MetricasGeneralesService } from './metricas-generales.service';
import { MetricasController } from './metricas.controller';

/**
 * Módulo de métricas y analíticas (SL12).
 *
 * Responsabilidades de este módulo:
 * - Escuchar eventos internos "metric.event" y persistirlos en MongoDB (fire-and-forget).
 * - Exponer el repositorio de métricas para otros servicios del módulo.
 * - Gateway WebSocket con autenticación JWT para actualizaciones en tiempo real (Slice 4).
 * - Endpoint POST /api/metricas/seed para insertar datos de prueba en desarrollo.
 *
 * El EventEmitterModule se registra en el AppModule con forRoot() para que
 * esté disponible globalmente en toda la aplicación.
 */
@Module({
  controllers: [MetricasController],
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
      provide: 'METRIC_EVENT_REPO',
      useFactory: (client: MongoClient) => new MetricEventRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    {
      provide: 'COMPANY_REPO',
      useFactory: (client: MongoClient) => new CompanyRepository(client.db()),
      inject: ['MONGO_CLIENT'],
    },
    MetricasListenerService,
    MetricasWsGateway,
    WsJwtGuard,
    MetricasSeedService,
    MetricasGeneralesService,
  ],
  exports: ['METRIC_EVENT_REPO'],
})
export class MetricasModule {}
