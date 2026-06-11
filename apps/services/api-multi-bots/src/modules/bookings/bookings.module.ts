import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import {
  BookingRepository,
  AgentRepository,
  CompanyRepository,
} from '@multibotagents/db';
import { BookingsController } from './bookings.controller';
import { GoogleCalendarController } from './google-calendar.controller';
import { BookingsService } from './bookings.service';
import { BOOKING_REPOSITORY } from './constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [BookingsController, GoogleCalendarController],
  providers: [
    // ─── MongoDB Client ────────────────────────────────────────────────────────
    {
      provide: 'BOOKING_MONGO_CLIENT',
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI es requerida para BookingsModule');
        return new MongoClient(uri);
      },
    },

    // ─── Repositorios ──────────────────────────────────────────────────────────
    {
      provide: BOOKING_REPOSITORY,
      useFactory: (client: MongoClient) => new BookingRepository(client.db()),
      inject: ['BOOKING_MONGO_CLIENT'],
    },
    {
      provide: 'AGENT_REPO',
      useFactory: (client: MongoClient) => new AgentRepository(client.db()),
      inject: ['BOOKING_MONGO_CLIENT'],
    },
    {
      provide: 'COMPANY_REPO',
      useFactory: (client: MongoClient) => new CompanyRepository(client.db()),
      inject: ['BOOKING_MONGO_CLIENT'],
    },

    // ─── Servicios ─────────────────────────────────────────────────────────────
    BookingsService,
    JwtAuthGuard,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
