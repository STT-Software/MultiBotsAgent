import { Injectable, Inject, Logger, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import type { ConnectWhatsAppResponse } from '@multibotagents/types';
import { encryptToken, checkPhoneNumberUniqueness } from '@multibotagents/core/whatsapp';
import type { ChannelRepository, CreateChannelData } from '@multibotagents/db';
import { MetaGraphApiProvider } from '../providers/meta-graph-api.provider';

/**
 * Parámetros para ejecutar el flujo de conexión de WhatsApp.
 */
export interface ConnectWhatsAppParams {
  agentId: string;
  wabaId: string;
  phoneNumberId: string;
  tokenCode?: string;
  accessToken?: string;
  pin?: string;
  companyId: string;
}

/**
 * Servicio que orquesta el flujo completo de conexión de un canal de WhatsApp.
 *
 * Pasos:
 * 1. Verificar unicidad del phoneNumberId
 * 2. Intercambiar tokenCode por Business Token con Meta Graph API
 * 3. Registrar número en Cloud API (1 reintento, 2s delay)
 * 4. Suscribir webhooks del WABA (3 reintentos, backoff exponencial: 2s, 4s, 8s)
 * 5. Configurar webhook override (no bloqueante, 0 reintentos)
 * 6. Cifrar y persistir credenciales
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.5, 8.3, 9.1
 */
@Injectable()
export class ConnectWhatsAppService {
  private readonly logger = new Logger(ConnectWhatsAppService.name);

  constructor(
    private readonly metaGraphApi: MetaGraphApiProvider,
    @Inject('CHANNEL_REPO') private readonly channelRepository: ChannelRepository,
  ) {}

  async execute(params: ConnectWhatsAppParams): Promise<ConnectWhatsAppResponse> {
    const { agentId, wabaId, phoneNumberId, tokenCode, accessToken, pin, companyId } = params;

    this.logger.log(
      `Connecting WhatsApp channel for agent ${agentId} (company: ${companyId}, phoneNumberId: ${phoneNumberId})`,
    );

    // ─── Step 1: Verificar unicidad del phoneNumberId ──────────────────────
    const existingChannels = await this.channelRepository.findAll({
      phoneNumberId,
    });

    const uniquenessResult = checkPhoneNumberUniqueness(
      phoneNumberId,
      agentId,
      existingChannels.map((ch) => ({
        id: ch.id,
        agentId: ch.agentId,
        status: ch.status,
      })),
    );

    if (!uniquenessResult.allowed) {
      if (uniquenessResult.reason === 'already_connected_other_agent') {
        throw new ConflictException(
          'El número ya está asociado a otro agente y debe desconectarse primero.',
        );
      }
      // already_connected_same_agent
      throw new ConflictException(
        'El número ya está conectado a este agente.',
      );
    }

    // ─── Step 2: Token Exchange / Manual Token ────────────────────────────
    let businessToken: string;
    if (tokenCode) {
      businessToken = await this.metaGraphApi.exchangeToken(tokenCode);
    } else if (accessToken) {
      businessToken = accessToken;
    } else {
      throw new BadRequestException(
        'Debe proporcionar un tokenCode o un accessToken.',
      );
    }

    // ─── Step 3: Registrar número en Cloud API (1 reintento, 2s delay) ─────
    try {
      await this.retryRegisterPhoneNumber(phoneNumberId, businessToken, pin);
    } catch (error) {
      const errorMsg = (error as Error).message || '';
      const isPinMismatch = errorMsg.includes('PIN') || errorMsg.includes('verification');
      
      if (uniquenessResult.action === 'update' || isPinMismatch) {
        this.logger.warn(
          `Phone number registration failed (PIN Mismatch or during update): ${errorMsg}. Proceeding anyway since token is valid.`
        );
      } else {
        throw error;
      }
    }

    // ─── Step 4: Suscribir webhooks (3 reintentos, backoff exponencial) ─────
    let webhooksSubscribed = true;
    try {
      await this.retrySubscribeWebhooks(wabaId, businessToken);
    } catch (error) {
      webhooksSubscribed = false;
      this.logger.warn(
        `Webhook subscription failed after retries for WABA ${wabaId}. Channel will be partially_connected.`,
      );
    }

    // ─── Step 5: Webhook Override (no bloqueante) ──────────────────────────
    let webhookOverrideUrl: string | undefined;
    if (webhooksSubscribed) {
      webhookOverrideUrl = await this.attemptWebhookOverride(phoneNumberId, businessToken);
    }

    // ─── Step 6: Obtener displayName y cifrar token ────────────────────────
    const phoneInfo = await this.metaGraphApi.getPhoneNumberInfo(phoneNumberId, businessToken);
    const displayName = phoneInfo.verifiedName || phoneInfo.displayPhoneNumber;

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      this.logger.error('ENCRYPTION_KEY not configured in environment');
      throw new InternalServerErrorException('Error interno del servidor');
    }

    const encryptedToken = encryptToken(businessToken, encryptionKey);

    // ─── Step 7: Persistir Channel ─────────────────────────────────────────
    const status = webhooksSubscribed ? 'connected' : 'partially_connected';
    const now = new Date();

    if (uniquenessResult.action === 'update') {
      // Reconexión: actualizar canal existente
      const updatedChannel = await this.channelRepository.updateCredentials(
        uniquenessResult.existingChannelId,
        {
          encryptedToken,
          status: 'connected',
          connectedAt: now,
        },
      );

      // If partially_connected, update status separately
      if (!webhooksSubscribed) {
        await this.channelRepository.update(uniquenessResult.existingChannelId, {
          status: 'partially_connected',
        });
      } else if (webhookOverrideUrl) {
        await this.channelRepository.update(uniquenessResult.existingChannelId, {
          webhookOverrideUrl,
        });
      }

      this.logger.log(
        `Channel ${updatedChannel.id} reconnected for agent ${agentId} with status: ${status}`,
      );

      return {
        channelId: updatedChannel.id,
        status,
        phoneNumberId,
        displayName,
      };
    }

    // Crear nuevo canal
    const channelData: CreateChannelData = {
      companyId,
      agentId,
      provider: 'whatsapp',
      status,
      phoneNumberId,
      wabaId,
      encryptedToken,
      displayName,
      webhookOverrideUrl,
      connectedAt: now,
    };

    const channel = await this.channelRepository.create(channelData);

    this.logger.log(
      `Channel ${channel.id} created for agent ${agentId} with status: ${status}`,
    );

    return {
      channelId: channel.id,
      status,
      phoneNumberId,
      displayName,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Registra el número con 1 reintento y 2s de delay.
   * Si falla después del reintento, deja que la excepción se propague.
   */
  private async retryRegisterPhoneNumber(
    phoneNumberId: string,
    token: string,
    pin?: string,
  ): Promise<void> {
    try {
      await this.metaGraphApi.registerPhoneNumber(phoneNumberId, token, pin);
    } catch (error) {
      this.logger.warn(
        `Phone number registration failed for ${phoneNumberId}, retrying in 2s...`,
      );
      await this.delay(2000);
      // Second attempt — let exception propagate if it fails
      await this.metaGraphApi.registerPhoneNumber(phoneNumberId, token, pin);
    }
  }

  /**
   * Suscribe webhooks con 3 reintentos y backoff exponencial (2s, 4s, 8s).
   * Lanza error si todos los intentos fallan.
   */
  private async retrySubscribeWebhooks(
    wabaId: string,
    token: string,
  ): Promise<void> {
    const delays = [2000, 4000, 8000]; // backoff exponencial
    let lastError: unknown;

    // First attempt (no delay)
    try {
      await this.metaGraphApi.subscribeWebhooks(wabaId, token);
      return;
    } catch (error) {
      lastError = error;
      this.logger.warn(
        `Webhook subscription attempt 1 failed for WABA ${wabaId}`,
      );
    }

    // Retry attempts with exponential backoff
    for (let i = 0; i < delays.length; i++) {
      await this.delay(delays[i]);
      try {
        await this.metaGraphApi.subscribeWebhooks(wabaId, token);
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Webhook subscription attempt ${i + 2} failed for WABA ${wabaId}`,
        );
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Intenta configurar el webhook override. No bloqueante: si falla, loguea warning y continúa.
   * @returns La URL del webhook override si se configuró exitosamente, undefined si falló.
   */
  private async attemptWebhookOverride(
    phoneNumberId: string,
    token: string,
  ): Promise<string | undefined> {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      this.logger.warn('WEBHOOK_URL not configured. Skipping webhook override.');
      return undefined;
    }

    try {
      await this.metaGraphApi.setWebhookOverride(phoneNumberId, token, webhookUrl);
      this.logger.log(`Webhook override configured for ${phoneNumberId}`);
      return webhookUrl;
    } catch (error) {
      this.logger.warn(
        `Webhook override failed for ${phoneNumberId}. Continuing without override.`,
      );
      return undefined;
    }
  }

  /**
   * Utility: espera un número de milisegundos.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
