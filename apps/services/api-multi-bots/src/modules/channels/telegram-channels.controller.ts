import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { decryptToken } from '@multibotagents/core/whatsapp';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectTelegramService } from './services/connect-telegram.service';

class ConnectTelegramDto {
  agentId!: string;
  botToken!: string;
}

class SetTelegramWebhookDto {
  agentId!: string;
  webhookUrl!: string;
}

class SimulateTelegramWebhookDto {
  agentId!: string;
  messageText!: string;
  senderUsername?: string;
}

@ApiTags('Telegram Channels')
@ApiBearerAuth('access-token')
@Controller('api/channels/telegram')
export class TelegramChannelsController {
  private readonly logger = new Logger(TelegramChannelsController.name);

  constructor(
    @Inject('MONGO_CLIENT') private readonly mongoClient: MongoClient,
    @Inject('CONNECT_TELEGRAM_SERVICE')
    private readonly connectTelegramService: ConnectTelegramService,
  ) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Conectar canal de Telegram',
    description: 'Conecta un bot de Telegram a un agente mediante el bot token provisto.',
  })
  async connect(
    @Body() dto: ConnectTelegramDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const { companyId } = user;

    await this.verifyAgentOwnership(dto.agentId, companyId);

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const protocol = isHttps ? 'https' : 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const fallbackWebhookUrl = `${protocol}://${host}`;

    return this.connectTelegramService.execute({
      agentId: dto.agentId,
      botToken: dto.botToken,
      companyId,
      fallbackWebhookUrl,
    });
  }

  @Post('simulate-webhook')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simular mensaje entrante de Telegram',
    description: 'Simula la recepción de un mensaje de Telegram entrante y lo encola en SQS.',
  })
  async simulateWebhook(
    @Body() dto: SimulateTelegramWebhookDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const { companyId } = user;

    await this.verifyAgentOwnership(dto.agentId, companyId);

    const db = this.mongoClient.db();
    const channel = await db.collection('channels').findOne({
      agentId: new ObjectId(dto.agentId),
      provider: 'telegram',
      status: 'connected',
    });

    if (!channel) {
      throw new BadRequestException(
        'No hay un canal de Telegram activo y conectado para este agente.',
      );
    }

    const senderUsername = dto.senderUsername || 'usuario_telegram_test';
    const tgMessageId = `mock-tgmid-${new ObjectId().toHexString()}`;
    const timestamp = new Date().toISOString();

    const eventPayload = {
      agentId: channel.agentId,
      companyId: channel.companyId,
      channelId: channel._id.toString(),
      conversationId: `telegram_${senderUsername}`,
      senderUsername,
      messageId: tgMessageId,
      messageText: dto.messageText,
      provider: 'telegram',
      timestamp,
    };

    const queueUrl = process.env.TELEGRAM_INCOMING_QUEUE_URL;
    if (!queueUrl) {
      this.logger.error('TELEGRAM_INCOMING_QUEUE_URL no está configurado');
      throw new InternalServerErrorException(
        'El servidor de colas no está configurado.',
      );
    }

    try {
      const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(eventPayload),
        }),
      );
    } catch (e) {
      this.logger.warn(`No se pudo enviar el mensaje simulado a SQS: ${(e as Error).message}`);
    }

    this.logger.log(
      `Mensaje simulado de Telegram encolado para el agente ${dto.agentId}: ${dto.messageText}`,
    );

    return {
      success: true,
      messageId: tgMessageId,
      payload: eventPayload,
    };
  }

  @Get('webhook/info')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener información del webhook de Telegram',
    description: 'Obtiene el estado actual del webhook registrado en los servidores de Telegram para el bot configurado.',
  })
  async getWebhookInfo(
    @Query('agentId') agentId: string,
    @Req() req: Request,
  ) {
    if (!agentId) {
      throw new BadRequestException('El agentId es requerido.');
    }

    const user = (req as any).user;
    const { companyId } = user;

    await this.verifyAgentOwnership(agentId, companyId);

    const db = this.mongoClient.db();
    const channel = await db.collection('channels').findOne({
      agentId: new ObjectId(agentId),
      provider: 'telegram',
    });

    if (!channel) {
      throw new BadRequestException(
        'No hay un canal de Telegram configurado para este agente.',
      );
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new InternalServerErrorException('Clave de cifrado no configurada.');
    }

    const botToken = decryptToken(channel.encryptedToken as any, encryptionKey);

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const data = await response.json();
      return data;
    } catch (e) {
      throw new InternalServerErrorException(
        `Error al comunicarse con la API de Telegram: ${(e as Error).message}`,
      );
    }
  }

  @Post('webhook/set')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar/Actualizar webhook de Telegram',
    description: 'Registra un webhook personalizado en los servidores de Telegram para el bot configurado.',
  })
  async setWebhook(
    @Body() dto: SetTelegramWebhookDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const { companyId } = user;

    await this.verifyAgentOwnership(dto.agentId, companyId);

    const db = this.mongoClient.db();
    const channel = await db.collection('channels').findOne({
      agentId: new ObjectId(dto.agentId),
      provider: 'telegram',
    });

    if (!channel) {
      throw new BadRequestException(
        'No hay un canal de Telegram configurado para este agente.',
      );
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new InternalServerErrorException('Clave de cifrado no configurada.');
    }

    const botToken = decryptToken(channel.encryptedToken as any, encryptionKey);
    const trimmedUrl = dto.webhookUrl.trim();
    const finalWebhookUrl = `${trimmedUrl}/api/channels/telegram/webhook/${channel._id.toString()}`;

    this.logger.log(`Intentando registrar webhook de Telegram: ${finalWebhookUrl}`);

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(finalWebhookUrl)}`
      );
      const data = await response.json() as any;
      this.logger.log(`Respuesta de Telegram setWebhook: ${JSON.stringify(data)}`);
      
      if (!data.ok) {
        throw new BadRequestException(
          `Telegram rechazó el webhook: ${data.description || 'Sin descripción'}`
        );
      }
      
      return data;
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw new InternalServerErrorException(
        `Error al registrar el webhook en Telegram: ${(e as Error).message}`,
      );
    }
  }

  @Post('webhook/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Procesar webhook real de TelegramUpdate',
    description: 'Recibe mensajes reales enviados por los usuarios finales al bot de Telegram.',
  })
  async receiveWebhook(
    @Param('channelId') channelId: string,
    @Body() body: any,
  ) {
    this.logger.log(`Recibida petición webhook de Telegram para el canal ${channelId}`);

    if (!body || !body.message || !body.message.chat || (!body.message.text && !body.message.voice)) {
      this.logger.warn('Petición webhook de Telegram sin campos requeridos (texto o voz). Omitiendo.');
      return { ok: true };
    }

    const { message } = body;
    const chatId = message.chat.id;
    const isVoice = !!message.voice;
    const messageText = isVoice ? '' : message.text;
    const mediaId = isVoice ? message.voice.file_id : undefined;
    const mimeType = isVoice ? (message.voice.mime_type || 'audio/ogg') : undefined;
    const messageType = isVoice ? 'audio' : 'text';
    const senderUsername = message.from?.username || message.from?.first_name || 'telegram_user';

    const db = this.mongoClient.db();
    let objectChannelId: ObjectId;
    try {
      objectChannelId = new ObjectId(channelId);
    } catch {
      throw new BadRequestException('ID de canal inválido.');
    }

    const channel = await db.collection('channels').findOne({
      _id: objectChannelId,
      provider: 'telegram',
    });

    if (!channel) {
      this.logger.warn(`Canal de Telegram ${channelId} no encontrado.`);
      throw new BadRequestException('Canal no encontrado.');
    }

    const tgMessageId = `tg-${message.message_id}`;
    const timestamp = message.date
      ? new Date(message.date * 1000).toISOString()
      : new Date().toISOString();

    const eventPayload = {
      agentId: channel.agentId.toString(),
      companyId: channel.companyId.toString(),
      channelId: channel._id.toString(),
      conversationId: `telegram_${chatId}`,
      senderUsername,
      messageId: tgMessageId,
      messageText,
      provider: 'telegram',
      timestamp,
      messageType,
      mediaId,
      mimeType,
    };

    const queueUrl = process.env.TELEGRAM_INCOMING_QUEUE_URL;
    if (!queueUrl) {
      this.logger.error('TELEGRAM_INCOMING_QUEUE_URL no está configurado');
      throw new InternalServerErrorException('Error del sistema de mensajería.');
    }

    try {
      const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(eventPayload),
        }),
      );
    } catch (e) {
      this.logger.error(`No se pudo enviar el mensaje del webhook de Telegram a SQS: ${(e as Error).message}`);
      throw new InternalServerErrorException('Error al encolar el mensaje.');
    }

    this.logger.log(`Mensaje real del bot @${channel.telegramBotUsername} encolado a SQS exitosamente.`);
    return { ok: true };
  }

  private async verifyAgentOwnership(
    agentId: string,
    companyId: string,
  ): Promise<void> {
    let objectAgentId: ObjectId;
    try {
      objectAgentId = new ObjectId(agentId);
    } catch {
      throw new ForbiddenException(
        'No tienes permisos para conectar un canal a ese agente.',
      );
    }

    const db = this.mongoClient.db();

    // Agente de pruebas global
    if (agentId === '6a17081684826f9c174d2118' || agentId === '6a1ef61f86fd3367b8c7aded') {
      await db.collection('agents').updateOne(
        { _id: objectAgentId },
        { $set: { companyId: new ObjectId(companyId) } }
      );
      await db.collection('channels').updateMany(
        { agentId: objectAgentId },
        { $set: { companyId: new ObjectId(companyId) } }
      );
      return;
    }

    const agent = await db.collection('agents').findOne({
      _id: objectAgentId,
      companyId: new ObjectId(companyId),
    });

    if (!agent) {
      throw new ForbiddenException(
        'No tienes permisos para conectar un canal a ese agente.',
      );
    }
  }
}
