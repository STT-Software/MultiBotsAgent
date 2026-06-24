import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import type { Agent, AuditLogPayload } from '@multibotagents/types';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Controlador REST para la gestión de personalidad e identidad de agentes.
 * Protegido con JWT Bearer token y con validación estricta de pertenencia de empresa.
 */
@ApiTags('Agents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── GET /agents ─────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar todos los agentes de la empresa',
    description: 'Obtiene el listado completo de agentes pertenecientes a la empresa del usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de agentes recuperado con éxito.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async getAgents(@Req() req: Request): Promise<Agent[]> {
    const { companyId } = (req as any).user;
    return this.agentsService.getAgentsByCompany(companyId);
  }

  // ─── GET /agents/:id ──────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener configuración de un agente',
    description: 'Obtiene todos los parámetros cognitivos y de personalidad de un agente específico, validando que pertenezca a la empresa del usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de MongoDB (24 caracteres hex) del agente.',
    example: '6a17081684826f9c174d2118',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos del agente recuperados con éxito.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'El agente solicitado pertenece a otra empresa o no tienes permisos.' })
  @ApiResponse({ status: 404, description: 'Agente no encontrado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async getAgent(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Agent> {
    const { companyId } = (req as any).user;
    return this.agentsService.getAgent(id, companyId);
  }

  // ─── POST /agents ─────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo agente',
    description: 'Crea un agente inicializado con parámetros de personalidad por defecto para la empresa del usuario autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Agente creado exitosamente.',
  })
  @ApiResponse({ status: 400, description: 'Datos de payload inválidos.' })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async createAgent(
    @Body() dto: CreateAgentDto,
    @Req() req: Request,
  ): Promise<Agent> {
    const { companyId, userId, email } = (req as any).user;
    const result = await this.agentsService.createAgent(companyId, dto);

    this.eventEmitter.emit("audit.create", {
      companyId,
      userId,
      userEmail: email,
      action: "agent.create",
      description: `Se creó el agente "${result.nombre}" (tipo: ${result.tipo})`,
      metadata: { agentId: result.id, tipo: result.tipo },
      timestamp: new Date(),
    } satisfies AuditLogPayload);

    return result;
  }

  // ─── PATCH /agents/:id ────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar configuración y personalidad de un agente',
    description: 'Actualiza parcialmente los datos de personalidad (nombre público, tono, restricciones, instrucciones adicionales) y generales de un agente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de MongoDB (24 caracteres hex) del agente.',
    example: '6a17081684826f9c174d2118',
  })
  @ApiResponse({
    status: 200,
    description: 'Agente actualizado exitosamente.',
  })
  @ApiResponse({ status: 400, description: 'Datos de payload inválidos o restricciones excedidas.' })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'El agente solicitado pertenece a otra empresa.' })
  @ApiResponse({ status: 404, description: 'Agente no encontrado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async updateAgent(
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
    @Req() req: Request,
  ): Promise<Agent> {
    const { companyId, userId, email } = (req as any).user;
    const result = await this.agentsService.updateAgent(id, companyId, dto);

    this.eventEmitter.emit("audit.create", {
      companyId,
      userId,
      userEmail: email,
      action: "agent.update",
      description: `Se actualizó la configuración del agente "${result.nombre}"`,
      metadata: { agentId: id, camposModificados: Object.keys(dto) },
      timestamp: new Date(),
    } satisfies AuditLogPayload);

    return result;
  }

  // ─── DELETE /agents/:id ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar un agente',
    description: 'Elimina de forma permanente un agente perteneciente a la empresa del usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de MongoDB (24 caracteres hex) del agente.',
    example: '6a17081684826f9c174d2118',
  })
  @ApiResponse({
    status: 200,
    description: 'Agente eliminado exitosamente.',
  })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'No tienes permisos sobre este agente.' })
  @ApiResponse({ status: 404, description: 'Agente no encontrado.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  async deleteAgent(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const { companyId, userId, email } = (req as any).user;
    const agent = await this.agentsService.getAgent(id, companyId);
    await this.agentsService.deleteAgent(id, companyId);

    this.eventEmitter.emit("audit.create", {
      companyId,
      userId,
      userEmail: email,
      action: "agent.delete",
      description: `Se eliminó el agente "${agent.nombre}"`,
      metadata: { agentId: id },
      timestamp: new Date(),
    } satisfies AuditLogPayload);

    return { success: true };
  }
}

