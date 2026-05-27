import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { ConnectWhatsAppResponse } from '@multibotagents/types';
import { MongoClient, ObjectId } from 'mongodb';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectWhatsAppDto } from './dto';
import { ConnectWhatsAppService } from './services/connect-whatsapp.service';

/**
 * Controlador REST para la gestión de canales de WhatsApp.
 * Maneja la conexión de números de WhatsApp a agentes mediante Embedded Signup.
 */
@ApiTags('Channels')
@ApiBearerAuth('access-token')
@Controller('api/channels/whatsapp')
export class ChannelsController {
  private readonly logger = new Logger(ChannelsController.name);

  constructor(
    @Inject('MONGO_CLIENT') private readonly mongoClient: MongoClient,
    @Inject('CONNECT_WHATSAPP_SERVICE')
    private readonly connectWhatsAppService: ConnectWhatsAppService,
  ) {}

  // ─── POST /api/channels/whatsapp/connect ─────────────────────────────────

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Conectar canal de WhatsApp',
    description: `
Conecta un número de WhatsApp a un agente de la plataforma mediante los datos obtenidos del flujo de Embedded Signup de Meta.

## Flujo
1. Valida el payload (agentId, wabaId, phoneNumberId, tokenCode)
2. Verifica que el agentId pertenece a la empresa del usuario autenticado
3. Delega al servicio de conexión (token exchange, registro, webhooks, persistencia)

## Autenticación
Requiere **Bearer token JWT** válido en el header \`Authorization\`.

## Permisos
El agentId debe pertenecer a la empresa del usuario autenticado (extraída del JWT).
    `,
  })
  @ApiBody({
    type: ConnectWhatsAppDto,
    description: 'Datos de conexión obtenidos del flujo de Embedded Signup de Meta.',
    examples: {
      'conexion-basica': {
        summary: 'Conexión de canal WhatsApp',
        value: {
          agentId: '683da2f1e4b0a1c2d3e4f5a6',
          wabaId: '123456789012345',
          phoneNumberId: '987654321098765',
          tokenCode: 'AQBx...',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Canal conectado exitosamente.',
    schema: {
      type: 'object',
      properties: {
        channelId: { type: 'string', example: '683da2f1e4b0a1c2d3e4f5b7' },
        status: { type: 'string', enum: ['connected', 'partially_connected'], example: 'connected' },
        phoneNumberId: { type: 'string', example: '987654321098765' },
        displayName: { type: 'string', example: 'Mi Empresa WhatsApp' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Payload inválido o token de Meta expirado.' })
  @ApiResponse({ status: 401, description: 'Token JWT no proporcionado o inválido.' })
  @ApiResponse({ status: 403, description: 'El agente no pertenece a la empresa del usuario.' })
  @ApiResponse({ status: 409, description: 'Número ya conectado a otro agente.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  @ApiResponse({ status: 502, description: 'Meta Graph API no disponible.' })
  async connect(
    @Body() dto: ConnectWhatsAppDto,
    @Req() req: Request,
  ): Promise<ConnectWhatsAppResponse> {
    const user = (req as any).user;
    const { companyId } = user;

    // Verificar que el agentId pertenece a la empresa del usuario autenticado
    await this.verifyAgentOwnership(dto.agentId, companyId);

    // Delegar al servicio de conexión
    return this.connectWhatsAppService.execute({
      agentId: dto.agentId,
      wabaId: dto.wabaId,
      phoneNumberId: dto.phoneNumberId,
      tokenCode: dto.tokenCode,
      companyId,
    });
  }

  /**
   * Verifica que el agentId pertenece a la empresa del usuario autenticado.
   * Consulta la colección de agentes en MongoDB para validar la propiedad.
   *
   * @throws ForbiddenException si el agente no existe o no pertenece a la empresa.
   */
  private async verifyAgentOwnership(
    agentId: string,
    companyId: string,
  ): Promise<void> {
    let objectAgentId: ObjectId;
    try {
      objectAgentId = new ObjectId(agentId);
    } catch {
      this.logger.warn(`Invalid agentId format: ${agentId}`);
      throw new ForbiddenException(
        'No tienes permisos para conectar un canal a ese agente.',
      );
    }

    const db = this.mongoClient.db();
    const agent = await db.collection('agents').findOne({
      _id: objectAgentId,
      companyId: new ObjectId(companyId),
    });

    if (!agent) {
      this.logger.warn(
        `Agent ownership check failed: agentId=${agentId}, companyId=${companyId}`,
      );
      throw new ForbiddenException(
        'No tienes permisos para conectar un canal a ese agente.',
      );
    }
  }
}
