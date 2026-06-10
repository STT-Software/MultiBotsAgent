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
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, QueryOrderDto } from './dto';
import type { Order } from '@multibotagents/types';

/**
 * Controlador REST para la gestión y visualización de pedidos (orders).
 * Todas las rutas están protegidas con JWT Bearer token y aisladas a nivel de empresa (companyId).
 */
@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── GET /orders ────────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar y filtrar pedidos',
    description: 'Obtiene el listado de pedidos (órdenes) de la empresa del usuario autenticado, permitiendo filtrar por agente, teléfono del cliente o estado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de pedidos recuperado con éxito.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'No tienes permisos sobre el agente solicitado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async getOrders(
    @Req() req: Request,
    @Query() query: QueryOrderDto,
  ): Promise<Order[]> {
    const { companyId } = (req as any).user;
    return this.ordersService.getOrders(companyId, query);
  }

  // ─── GET /orders/:id ─────────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener detalles de un pedido',
    description: 'Obtiene los detalles completos de un pedido específico, validando el aislamiento por empresa.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de MongoDB (24 caracteres hex) del pedido.',
    example: '60d5ec49f1b29c3a388fbf05',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles del pedido recuperados con éxito.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'El pedido pertenece a otra empresa.' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async getOrder(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Order> {
    const { companyId } = (req as any).user;
    return this.ordersService.getOrder(id, companyId);
  }

  // ─── POST /orders ────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un pedido manualmente',
    description: 'Crea un pedido directamente desde el panel de control, validando que el agente sea del tipo correcto y pertenezca a la empresa actual.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pedido creado de manera exitosa.',
  })
  @ApiResponse({ status: 400, description: 'Payload inválido o agente no es del tipo cotizador.' })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'El agente solicitado pertenece a otra empresa.' })
  @ApiResponse({ status: 404, description: 'Agente no encontrado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async createOrder(
    @Req() req: Request,
    @Body() dto: CreateOrderDto,
  ): Promise<Order> {
    const { companyId } = (req as any).user;
    return this.ordersService.createOrder(companyId, dto);
  }

  // ─── PATCH /orders/:id ───────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar un pedido',
    description: 'Modifica parámetros de un pedido existente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del pedido a actualizar.',
    example: '60d5ec49f1b29c3a388fbf05',
  })
  @ApiResponse({
    status: 200,
    description: 'Pedido actualizado con éxito.',
  })
  @ApiResponse({ status: 400, description: 'Payload de actualización inválido.' })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'El pedido pertenece a otra empresa.' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async updateOrder(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateOrderDto,
  ): Promise<Order> {
    const { companyId } = (req as any).user;
    return this.ordersService.updateOrder(id, companyId, dto);
  }

  // ─── DELETE /orders/:id ──────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar un pedido',
    description: 'Elimina físicamente un pedido de la base de datos.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del pedido a eliminar.',
    example: '60d5ec49f1b29c3a388fbf05',
  })
  @ApiResponse({
    status: 200,
    description: 'Pedido eliminado con éxito.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'El pedido pertenece a otra empresa.' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async deleteOrder(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const { companyId } = (req as any).user;
    const success = await this.ordersService.deleteOrder(id, companyId);
    return { success };
  }
}
