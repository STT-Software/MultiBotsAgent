import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
  Get,
  Query,
  NotFoundException,
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
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectWhatsAppDto, SimulateWebhookDto } from './dto';
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
      accessToken: dto.accessToken,
      pin: dto.pin,
      companyId,
    });
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener estado del canal de WhatsApp',
    description: 'Obtiene el estado de conexión actual del canal de WhatsApp asociado al agente.',
  })
  async getStatus(
    @Query('agentId') agentId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const { companyId } = user;

    if (!agentId) {
      throw new BadRequestException('agentId es requerido.');
    }

    // Verificar propiedad del agente
    await this.verifyAgentOwnership(agentId, companyId);

    const db = this.mongoClient.db();
    const channel = await db.collection('channels').findOne({
      agentId: new ObjectId(agentId),
    });

    if (!channel) {
      throw new NotFoundException('No hay canal configurado para este agente.');
    }

    return {
      channelId: channel._id.toHexString(),
      status: channel.status,
      phoneNumberId: channel.phoneNumberId,
      telegramBotUsername: channel.telegramBotUsername,
      displayName: channel.displayName,
      provider: channel.provider || 'whatsapp',
      connectedAt: channel.connectedAt ? channel.connectedAt.toISOString() : new Date().toISOString(),
    };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desconectar canal de WhatsApp',
    description: 'Desconecta y elimina un canal de WhatsApp asociado a un agente.',
  })
  async disconnect(
    @Body('channelId') channelId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const { companyId } = user;

    if (!channelId) {
      throw new BadRequestException('channelId es requerido.');
    }

    const db = this.mongoClient.db();
    let objectChannelId: ObjectId;
    try {
      objectChannelId = new ObjectId(channelId);
    } catch {
      throw new BadRequestException('Formato de channelId inválido.');
    }

    // Buscar el canal por _id
    const channel = await db.collection('channels').findOne({
      _id: objectChannelId,
    });

    if (!channel) {
      throw new ForbiddenException('No tienes permisos sobre este canal o no existe.');
    }

    // Verificar que el agente del canal pertenece a la empresa del usuario
    const agentIdStr = channel.agentId instanceof ObjectId
      ? channel.agentId.toHexString()
      : String(channel.agentId);
    await this.verifyAgentOwnership(agentIdStr, companyId);

    // Eliminar el canal
    const result = await db.collection('channels').deleteOne({ _id: objectChannelId });
    if (result.deletedCount !== 1) {
      throw new InternalServerErrorException('Error al eliminar el canal.');
    }

    this.logger.log(`Canal de WhatsApp desconectado/eliminado: ${channelId}`);
    return { success: true };
  }

  @Post('simulate-webhook')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simular mensaje entrante de WhatsApp',
    description: 'Simula la recepción de un mensaje de WhatsApp entrante y lo encola en SQS para probar el flujo RAG.',
  })
  async simulateWebhook(
    @Body() dto: SimulateWebhookDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const { companyId } = user;

    // Verificar que el agentId pertenece a la empresa del usuario autenticado
    await this.verifyAgentOwnership(dto.agentId, companyId);

    // Buscar el canal de WhatsApp activo para este agente
    const db = this.mongoClient.db();
    const channel = await db.collection('channels').findOne({
      agentId: dto.agentId,
      provider: 'whatsapp',
      status: 'connected',
    });

    if (!channel) {
      throw new BadRequestException(
        'No hay un canal de WhatsApp activo y conectado para este agente.',
      );
    }

    const senderPhoneNumber = dto.senderPhoneNumber || '573024883835';
    const waMessageId = `mock-wamid-${new ObjectId().toHexString()}`;
    const timestamp = new Date().toISOString();

    const eventPayload = {
      agentId: channel.agentId,
      companyId: channel.companyId,
      channelId: channel.id.toString(),
      conversationId: `whatsapp_${senderPhoneNumber}`,
      senderPhoneNumber,
      phoneNumberId: channel.phoneNumberId,
      messageId: waMessageId,
      messageText: dto.messageText,
      timestamp,
    };

    const queueUrl = process.env.WHATSAPP_INCOMING_QUEUE_URL;
    if (!queueUrl) {
      this.logger.error('WHATSAPP_INCOMING_QUEUE_URL no está configurado');
      throw new InternalServerErrorException(
        'El servidor de colas no está configurado.',
      );
    }

    const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(eventPayload),
      }),
    );

    this.logger.log(
      `Mensaje simulado encolado exitosamente para el agente ${dto.agentId}: ${dto.messageText}`,
    );

    return {
      success: true,
      messageId: waMessageId,
      payload: eventPayload,
    };
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

    // Si es el agente de pruebas global, asignarlo dinámicamente a la compañía actual del usuario
    if (agentId === '6a17081684826f9c174d2118' || agentId === '6a1ef61f86fd3367b8c7aded') {
      await db.collection('agents').updateOne(
        { _id: objectAgentId },
        { $set: { companyId: new ObjectId(companyId) } }
      );
      // Sincronizar también los canales del agente global
      await db.collection('channels').updateMany(
        { agentId: objectAgentId },
        { $set: { companyId: new ObjectId(companyId) } }
      );
      this.logger.log(`Dynamic company ownership update for test agent ${agentId} and its channels to company ${companyId}`);
      return;
    }

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
