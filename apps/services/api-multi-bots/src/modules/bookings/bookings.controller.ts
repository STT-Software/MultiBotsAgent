import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto, QueryBookingDto } from './dto';
import type { Booking } from '@multibotagents/types';

/**
 * Controlador REST para la gestión manual y visualización de reservas (citas).
 * Todas las rutas están protegidas con JWT Bearer token y aisladas a nivel de empresa (companyId).
 */
@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ─── GET /bookings ─────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar y filtrar reservas',
    description: 'Obtiene el listado de reservas (citas) de la empresa del usuario autenticado, permitiendo filtrar por agente, teléfono del cliente, estado o un rango de fechas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de reservas recuperado con éxito.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'No tienes permisos sobre el agente solicitado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async getBookings(
    @Req() req: Request,
    @Query() query: QueryBookingDto,
  ): Promise<Booking[]> {
    const { companyId } = (req as any).user;
    return this.bookingsService.getBookings(companyId, query);
  }

  // ─── GET /bookings/:id ──────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener detalles de una reserva',
    description: 'Obtiene los detalles completos de una reserva específica, validando el aislamiento por empresa.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de MongoDB (24 caracteres hex) de la reserva.',
    example: '60d5ec49f1b29c3a388fbf05',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la reserva recuperados con éxito.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'La reserva pertenece a otra empresa.' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async getBooking(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Booking> {
    const { companyId } = (req as any).user;
    return this.bookingsService.getBooking(id, companyId);
  }

  // ─── POST /bookings ─────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una reserva manualmente',
    description: 'Crea una cita/reserva directamente desde el panel de control, validando que el agente sea del tipo correcto y pertenezca a la empresa actual.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reserva creada de manera exitosa.',
  })
  @ApiResponse({ status: 400, description: 'Payload inválido o agente no es del tipo agendamiento.' })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'El agente solicitado pertenece a otra empresa.' })
  @ApiResponse({ status: 404, description: 'Agente no encontrado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async createBooking(
    @Req() req: Request,
    @Body() dto: CreateBookingDto,
  ): Promise<Booking> {
    const { companyId } = (req as any).user;
    return this.bookingsService.createBooking(companyId, dto);
  }

  // ─── PATCH /bookings/:id ────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar o reprogramar una reserva',
    description: 'Modifica parámetros de una cita existente. Si se modifica la fecha/hora (`dateTime`), se incrementa automáticamente el contador de reprogramaciones.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la reserva a actualizar.',
    example: '60d5ec49f1b29c3a388fbf05',
  })
  @ApiResponse({
    status: 200,
    description: 'Reserva actualizada con éxito.',
  })
  @ApiResponse({ status: 400, description: 'Payload inválido o formato de fecha erróneo.' })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'La reserva pertenece a otra empresa.' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async updateBooking(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateBookingDto,
  ): Promise<Booking> {
    const { companyId } = (req as any).user;
    return this.bookingsService.updateBooking(id, companyId, dto);
  }

  // ─── DELETE /bookings/:id ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar una reserva',
    description: 'Realiza una cancelación lógica de la cita actualizando su estado a "cancelled".',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la reserva a cancelar.',
    example: '60d5ec49f1b29c3a388fbf05',
  })
  @ApiResponse({
    status: 200,
    description: 'Reserva cancelada con éxito.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'La reserva pertenece a otra empresa.' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async cancelBooking(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Booking> {
    const { companyId } = (req as any).user;
    return this.bookingsService.cancelBooking(id, companyId);
  }
}
