import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { decryptToken } from '@multibotagents/core';
import type { IBookingRepository, IAgentRepository } from '@multibotagents/db';
import { Booking, EmailTemplate } from '@multibotagents/types';
import { BOOKING_REPOSITORY } from './constants';
import { CreateBookingDto, UpdateBookingDto, QueryBookingDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    @Inject('AGENT_REPO')
    private readonly agentRepository: IAgentRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper privado para instanciar el cliente OAuth y cargarlo con el token de refresco descifrado.
   */
  private getGoogleCalendarClientForAgent(agent: any) {
    if (!agent.googleCalendarRefreshToken) {
      throw new BadRequestException('El agente no tiene vinculado Google Calendar.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'Las credenciales globales de Google OAuth no están configuradas en el servidor.',
      );
    }
    if (!encryptionKey) {
      throw new BadRequestException('ENCRYPTION_KEY no está configurada en el servidor.');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const decryptedRefreshToken = decryptToken(agent.googleCalendarRefreshToken, encryptionKey);

    oauth2Client.setCredentials({
      refresh_token: decryptedRefreshToken,
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Helper privado para interceptar revocación de tokens y auto-desconectar preventivamente al agente en MongoDB.
   */
  private async handleGoogleCalendarError(agentId: string, error: any) {
    const message = error?.message || String(error);
    const code = error?.code || error?.status;

    if (
      message.includes('invalid_grant') ||
      message.includes('invalid_token') ||
      code === 401 ||
      code === 400
    ) {
      // Auto-desconectar preventivamente al agente
      await this.agentRepository.update(agentId, {
        googleCalendarEmail: null,
        googleCalendarRefreshToken: null,
      } as any);
      throw new BadRequestException(
        'La conexión con Google Calendar ha sido revocada o expiró. El agente ha sido desvinculado automáticamente.',
      );
    }
    throw error;
  }

  /**
   * Verifica los slots horarios disponibles para una fecha específica cruzando Google Calendar y MongoDB local.
   */
  async checkAvailability(
    agentId: string,
    dateStr: string,
    timeOfDay: 'morning' | 'afternoon' | 'any' = 'any',
  ): Promise<string[]> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agente no encontrado: ${agentId}`);
    }

    // Usar start y end de la fecha en formato YYYY-MM-DD
    const startOfDay = new Date(`${dateStr}T00:00:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59`);

    if (isNaN(startOfDay.getTime()) || isNaN(endOfDay.getTime())) {
      throw new BadRequestException('Fecha inválida. Use formato YYYY-MM-DD.');
    }

    const busyIntervals: { start: Date; end: Date }[] = [];

    // 1. Obtener eventos de Google Calendar si el agente lo tiene vinculado
    if (agent.googleCalendarRefreshToken) {
      try {
        const calendar = this.getGoogleCalendarClientForAgent(agent);
        const gcalResponse = await calendar.events.list({
          calendarId: 'primary',
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
        });

        const items = gcalResponse.data.items || [];
        for (const item of items) {
          if (item.start?.dateTime && item.end?.dateTime) {
            busyIntervals.push({
              start: new Date(item.start.dateTime),
              end: new Date(item.end.dateTime),
            });
          } else if (item.start?.date) {
            // Evento de todo el día
            busyIntervals.push({
              start: new Date(`${item.start.date}T00:00:00`),
              end: new Date(`${item.start.date}T23:59:59`),
            });
          }
        }
      } catch (error) {
        // Capturar revocaciones y preventivamente desvincular
        try {
          await this.handleGoogleCalendarError(agentId, error);
        } catch {
          // Si es un error de red simple u otro, no crash del flujo local
        }
      }
    }

    // 2. Obtener reservas locales confirmadas o reprogramadas para esa fecha
    const localBookings = await this.bookingRepository.findByDateRange(agent.companyId, startOfDay, endOfDay);
    const activeLocalBookings = localBookings.filter(b => b.agentId === agentId && b.status !== 'cancelled');

    for (const b of activeLocalBookings) {
      busyIntervals.push({
        start: new Date(b.dateTime),
        end: new Date(b.dateTime.getTime() + (b.durationMinutes ?? 30) * 60 * 1000),
      });
    }

    // 3. Generar slots de disponibilidad comercial
    // Lunes a Viernes: 9:00 AM - 6:00 PM (18:00). Sábado: 9:00 AM - 1:00 PM (13:00). Domingo: Cerrado.
    const dayOfWeek = startOfDay.getDay(); // 0 = Domingo, 6 = Sábado, 1-5 = Lunes-Viernes
    const startHour = 9;
    let endHour = 18;

    if (dayOfWeek === 0) {
      // Domingo cerrado
      return [];
    } else if (dayOfWeek === 6) {
      // Sábado hasta la 1:00 PM
      endHour = 13;
    }

    const slotDurationMs = 30 * 60 * 1000; // Slots de 30 minutos
    const availableSlots: string[] = [];

    const currentSlot = new Date(startOfDay);
    currentSlot.setHours(startHour, 0, 0, 0);

    const endTime = new Date(startOfDay);
    endTime.setHours(endHour, 0, 0, 0);

    while (currentSlot.getTime() < endTime.getTime()) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(currentSlot.getTime() + slotDurationMs);

      // Comprobar si el slot se solapa con algún intervalo ocupado
      const isBusy = busyIntervals.some(interval => {
        return slotStart.getTime() < interval.end.getTime() && slotEnd.getTime() > interval.start.getTime();
      });

      if (!isBusy) {
        const hours = String(slotStart.getHours()).padStart(2, '0');
        const minutes = String(slotStart.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        // Filtrar por preferencia timeOfDay
        if (timeOfDay === 'morning' && slotStart.getHours() < 12) {
          availableSlots.push(timeStr);
        } else if (timeOfDay === 'afternoon' && slotStart.getHours() >= 12) {
          availableSlots.push(timeStr);
        } else if (timeOfDay === 'any' || !timeOfDay) {
          availableSlots.push(timeStr);
        }
      }

      currentSlot.setTime(currentSlot.getTime() + slotDurationMs);
    }

    return availableSlots;
  }

  /**
   * Crea una nueva reserva en la base de datos e interactúa con la API de Google Calendar si está vinculada.
   */
  async createBooking(companyId: string, dto: CreateBookingDto): Promise<Booking> {
    // 1. Validar que el agente exista y pertenezca a la misma empresa
    const agent = await this.agentRepository.findById(dto.agentId);
    if (!agent) {
      throw new NotFoundException(`Agente no encontrado: ${dto.agentId}`);
    }
    if (agent.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos sobre el agente seleccionado.');
    }
    if (agent.tipo !== 'agendamiento') {
      throw new BadRequestException('El agente seleccionado no es del tipo agendamiento.');
    }

    // 2. Generar un ID ficticio por defecto
    let googleEventId = `mock_${Math.random().toString(36).substring(2, 15)}`;

    // 3. Si tiene vinculación activa, llamar a Google Calendar API
    if (agent.googleCalendarRefreshToken) {
      try {
        const calendar = this.getGoogleCalendarClientForAgent(agent);
        const startDateTime = new Date(dto.dateTime);
        const duration = dto.durationMinutes ?? 30;
        const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
        const timezone = agent.timezone || 'America/Bogota';

        const eventResponse = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: `Cita: ${dto.customerName}`,
            description: dto.notes || `Cita coordinada por el bot para ${dto.customerName}`,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: timezone,
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: timezone,
            },
            attendees: dto.customerEmail ? [{ email: dto.customerEmail }] : undefined,
          },
        });
        if (eventResponse.data.id) {
          googleEventId = eventResponse.data.id;
        }
      } catch (error) {
        await this.handleGoogleCalendarError(dto.agentId, error);
      }
    }

    // 4. Crear el booking en base de datos
    const bookingData: Omit<Booking, 'id'> = {
      companyId,
      agentId: dto.agentId,
      googleEventId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      dateTime: new Date(dto.dateTime),
      durationMinutes: dto.durationMinutes ?? 30,
      status: 'confirmed',
      notes: dto.notes,
      rescheduleCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdBooking = await this.bookingRepository.create(bookingData);

    // 5. Notificar a los operadores (WebSocket + Email) y al cliente (Email)
    const agentName = agent.personality?.name || agent.nombre || 'Agente';

    await this.notificationsService.notificarNuevoBooking({
      companyId,
      bookingId: createdBooking.id,
      customerName: createdBooking.customerName,
      dateTime: createdBooking.dateTime,
      agentName,
    });

    if (createdBooking.customerEmail) {
      await this.notificationsService.notificarClienteBooking({
        template: EmailTemplate.BOOKING_CONFIRMED,
        customerEmail: createdBooking.customerEmail,
        customerName: createdBooking.customerName,
        dateTime: createdBooking.dateTime,
        agentName,
      });
    }

    return createdBooking;
  }

  /**
   * Obtiene y filtra las reservas de una empresa específica.
   */
  async getBookings(companyId: string, query: QueryBookingDto): Promise<Booking[]> {
    // Si se especifica agentId, validar que pertenezca a la empresa
    if (query.agentId) {
      const agent = await this.agentRepository.findById(query.agentId);
      if (!agent || agent.companyId !== companyId) {
        throw new ForbiddenException('No tienes permisos sobre el agente solicitado.');
      }
    }

    // Si hay un rango de fechas
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Formato de fecha inválido para el rango.');
      }

      // Obtener reservas en rango
      let bookings = await this.bookingRepository.findByDateRange(companyId, start, end);

      // Aplicar filtros adicionales en memoria si es necesario
      if (query.agentId) {
        bookings = bookings.filter((b) => b.agentId === query.agentId);
      }
      if (query.customerPhone) {
        bookings = bookings.filter((b) => b.customerPhone === query.customerPhone);
      }
      if (query.status) {
        bookings = bookings.filter((b) => b.status === query.status);
      }

      return bookings;
    }

    // Búsqueda general
    const filter: Partial<Booking> = { companyId };
    if (query.agentId) filter.agentId = query.agentId;
    if (query.customerPhone) filter.customerPhone = query.customerPhone;
    if (query.status) filter.status = query.status;

    return this.bookingRepository.findAll(filter);
  }

  /**
   * Obtiene los detalles de una reserva por su ID, validando pertenencia.
   */
  async getBooking(id: string, companyId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Reserva no encontrada: ${id}`);
    }
    if (booking.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos para ver esta reserva.');
    }
    return booking;
  }

  /**
   * Actualiza una reserva. Si se cambia la fecha, incrementa el rescheduleCount. Sincroniza con Google Calendar.
   */
  async updateBooking(id: string, companyId: string, dto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Reserva no encontrada: ${id}`);
    }
    if (booking.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos para modificar esta reserva.');
    }

    const updateData: Partial<Booking> = {};
    if (dto.customerName !== undefined) updateData.customerName = dto.customerName;
    if (dto.customerPhone !== undefined) updateData.customerPhone = dto.customerPhone;
    if (dto.customerEmail !== undefined) updateData.customerEmail = dto.customerEmail;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.durationMinutes !== undefined) updateData.durationMinutes = dto.durationMinutes;

    // Lógica para reprogramación
    if (dto.dateTime !== undefined) {
      const newDate = new Date(dto.dateTime);
      if (isNaN(newDate.getTime())) {
        throw new BadRequestException('Nueva fecha y hora inválidas.');
      }

      // Si la fecha realmente cambia, incrementamos el contador y cambiamos el estado
      if (booking.dateTime.getTime() !== newDate.getTime()) {
        updateData.dateTime = newDate;
        updateData.rescheduleCount = (booking.rescheduleCount ?? 0) + 1;
        updateData.status = 'rescheduled';
      }
    }

    // Actualización de estado explícito
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    // Sincronizar cambios en Google Calendar si está vinculado y existe un googleEventId
    const agent = await this.agentRepository.findById(booking.agentId);
    if (agent && agent.googleCalendarRefreshToken && booking.googleEventId && !booking.googleEventId.startsWith('mock_')) {
      try {
        const calendar = this.getGoogleCalendarClientForAgent(agent);
        const startDateTime = updateData.dateTime || booking.dateTime;
        const duration = updateData.durationMinutes || booking.durationMinutes;
        const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
        const timezone = agent.timezone || 'America/Bogota';

        await calendar.events.patch({
          calendarId: 'primary',
          eventId: booking.googleEventId,
          requestBody: {
            summary: `Cita: ${updateData.customerName || booking.customerName}`,
            description: updateData.notes !== undefined ? updateData.notes : booking.notes,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: timezone,
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: timezone,
            },
            attendees: (updateData.customerEmail || booking.customerEmail)
              ? [{ email: updateData.customerEmail || booking.customerEmail }]
              : undefined,
          },
        });
      } catch (error) {
        await this.handleGoogleCalendarError(booking.agentId, error);
      }
    }

    const updatedBooking = await this.bookingRepository.update(id, updateData);

    // Notificar al cliente si la reserva se reprogramó o canceló
    if (updatedBooking.customerEmail) {
      const agentName = agent?.personality?.name || agent?.nombre || 'Agente';
      let template: EmailTemplate | null = null;

      if (updateData.status === 'rescheduled') {
        template = EmailTemplate.BOOKING_RESCHEDULED;
      } else if (updateData.status === 'cancelled') {
        template = EmailTemplate.BOOKING_CANCELLED;
      }

      if (template) {
        await this.notificationsService.notificarClienteBooking({
          template,
          customerEmail: updatedBooking.customerEmail,
          customerName: updatedBooking.customerName,
          dateTime: updatedBooking.dateTime,
          agentName,
        });
      }
    }

    return updatedBooking;
  }

  /**
   * Cancela una reserva de manera lógica actualizando su estado y eliminando el evento de Google Calendar.
   */
  async cancelBooking(id: string, companyId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Reserva no encontrada: ${id}`);
    }
    if (booking.companyId !== companyId) {
      throw new ForbiddenException('No tienes permisos para cancelar esta reserva.');
    }

    if (booking.status === 'cancelled') {
      return booking; // Ya está cancelada
    }

    // Eliminar evento de Google Calendar si existe
    const agent = await this.agentRepository.findById(booking.agentId);
    if (agent && agent.googleCalendarRefreshToken && booking.googleEventId && !booking.googleEventId.startsWith('mock_')) {
      try {
        const calendar = this.getGoogleCalendarClientForAgent(agent);
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: booking.googleEventId,
        });
      } catch (error) {
        await this.handleGoogleCalendarError(booking.agentId, error);
      }
    }

    const cancelledBooking = await this.bookingRepository.update(id, { status: 'cancelled' });

    // Notificar al cliente
    if (cancelledBooking.customerEmail) {
      const agentName = agent?.personality?.name || agent?.nombre || 'Agente';
      await this.notificationsService.notificarClienteBooking({
        template: EmailTemplate.BOOKING_CANCELLED,
        customerEmail: cancelledBooking.customerEmail,
        customerName: cancelledBooking.customerName,
        dateTime: cancelledBooking.dateTime,
        agentName,
      });
    }

    return cancelledBooking;
  }
}
