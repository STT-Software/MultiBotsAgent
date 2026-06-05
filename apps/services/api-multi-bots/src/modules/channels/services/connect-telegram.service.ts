import { Injectable, Inject, Logger, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { encryptToken } from '@multibotagents/core/whatsapp';
import type { ChannelRepository } from '@multibotagents/db';

export interface ConnectTelegramParams {
  agentId: string;
  botToken: string;
  companyId: string;
  fallbackWebhookUrl?: string;
}

export interface ConnectTelegramResponse {
  channelId: string;
  status: 'connected';
  telegramBotUsername: string;
  displayName: string;
}

@Injectable()
export class ConnectTelegramService {
  private readonly logger = new Logger(ConnectTelegramService.name);

  constructor(
    @Inject('CHANNEL_REPO') private readonly channelRepository: ChannelRepository,
  ) {}

  async execute(params: ConnectTelegramParams): Promise<ConnectTelegramResponse> {
    const { agentId, botToken, companyId, fallbackWebhookUrl } = params;

    this.logger.log(
      `Connecting Telegram channel for agent ${agentId} (company: ${companyId})`,
    );

    if (!botToken) {
      throw new BadRequestException('El botToken es requerido.');
    }

    // 1. Validar el token llamando a la API de Telegram
    let botUsername = '';
    let botFirstName = '';

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        const description = errorData.description || `HTTP ${response.status}`;
        throw new BadRequestException(`Token de Telegram inválido: ${description}`);
      }

      const data = (await response.json()) as any;
      if (data.ok && data.result) {
        botUsername = data.result.username;
        botFirstName = data.result.first_name;
      } else {
        throw new BadRequestException('Respuesta inválida de la API de Telegram.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error de conexión con Telegram API: ${(error as Error).message}`);
      
      // Fallback para entornos locales sin internet o con tokens simulados
      if (botToken.startsWith('123456789:') || botToken === 'simulated-token') {
        botUsername = 'BotSimulado_bot';
        botFirstName = 'Bot Simulado Local';
        this.logger.warn('Usando datos simulados de Telegram debido a formato de prueba.');
      } else {
        throw new BadRequestException(
          `No se pudo establecer comunicación con la API de Telegram: ${(error as Error).message}`,
        );
      }
    }

    // 2. Verificar si ya existe un canal para este agente
    const existingChannel = await this.channelRepository.findByAgentId(agentId);
    
    // Cifrar el token de Telegram
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      this.logger.error('ENCRYPTION_KEY no configurado en el servidor');
      throw new InternalServerErrorException('Error interno del servidor.');
    }
    const encryptedToken = encryptToken(botToken, encryptionKey);
    const now = new Date();

    let channelId = '';

    if (existingChannel) {
      if (existingChannel.provider === 'whatsapp') {
        throw new ConflictException(
          'Este agente ya tiene un canal de WhatsApp conectado. Desconéctalo primero.',
        );
      }

      // Si ya era Telegram, lo actualizamos
      const updated = await this.channelRepository.update(existingChannel.id, {
        encryptedToken,
        displayName: botFirstName,
        telegramBotUsername: botUsername,
        status: 'connected',
        updatedAt: now,
      } as any);
      channelId = updated.id;
    } else {
      // Crear canal de Telegram nuevo
      const created = await this.channelRepository.create({
        companyId,
        agentId,
        provider: 'telegram',
        status: 'connected',
        telegramBotUsername: botUsername,
        encryptedToken,
        displayName: botFirstName,
        connectedAt: now,
      } as any);
      channelId = created.id;
    }

    // 3. Intentar registrar el Webhook ante Telegram (no bloqueante para no interferir si hay bloqueos de red)
    try {
      const webhookUrl = process.env.WEBHOOK_URL || fallbackWebhookUrl;
      if (webhookUrl) {
        const trimmedUrl = webhookUrl.trim();
        const tgWebhookUrl = `${trimmedUrl}/api/channels/telegram/webhook/${channelId}`;
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(tgWebhookUrl)}`
        );
        const data = await response.json() as any;
        this.logger.log(`Telegram automatic setWebhook response: ${JSON.stringify(data)}`);
        this.logger.log(`Telegram webhook configurado exitosamente: ${tgWebhookUrl}`);
      } else {
        this.logger.warn('No se pudo determinar la URL pública (WEBHOOK_URL o fallbackWebhookUrl vacías) para el webhook de Telegram.');
      }
    } catch (e) {
      this.logger.warn(`No se pudo configurar el webhook de Telegram automáticamente: ${(e as Error).message}`);
    }

    return {
      channelId,
      status: 'connected',
      telegramBotUsername: botUsername,
      displayName: botFirstName,
    };
  }
}
