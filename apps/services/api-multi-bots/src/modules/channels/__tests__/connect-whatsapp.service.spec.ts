import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectWhatsAppService } from '../services/connect-whatsapp.service';
import { MetaGraphApiProvider } from '../providers/meta-graph-api.provider';
import { ChannelRepository } from '@multibotagents/db';
import { ConflictException } from '@nestjs/common';
import * as whatsappCore from '@multibotagents/core/whatsapp';

describe('ConnectWhatsAppService', () => {
  let service: ConnectWhatsAppService;
  let metaGraphApi: MetaGraphApiProvider;
  let channelRepository: ChannelRepository;

  beforeEach(() => {
    metaGraphApi = {
      exchangeToken: vi.fn(),
      registerPhoneNumber: vi.fn(),
      subscribeWebhooks: vi.fn(),
      setWebhookOverride: vi.fn(),
      getPhoneNumberInfo: vi.fn(),
    } as unknown as MetaGraphApiProvider;

    channelRepository = {
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateCredentials: vi.fn(),
    } as unknown as ChannelRepository;

    service = new ConnectWhatsAppService(metaGraphApi, channelRepository);

    process.env.ENCRYPTION_KEY = '01234567890123456789012345678901';
    process.env.WEBHOOK_URL = 'https://example.com/webhook';

    vi.spyOn(whatsappCore, 'encryptToken').mockReturnValue({
      ciphertext: 'cipher',
      iv: 'iv',
      tag: 'tag',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.ENCRYPTION_KEY;
    delete process.env.WEBHOOK_URL;
  });

  beforeEach(() => {
    vi.spyOn(service as any, 'delay').mockResolvedValue(undefined);
  });

  describe('Happy Path (CREATE)', () => {
    it('should create a new channel and return success', async () => {
      vi.spyOn(whatsappCore, 'checkPhoneNumberUniqueness').mockReturnValue({
        allowed: true,
        action: 'create',
      });
      vi.mocked(channelRepository.findAll).mockResolvedValue([]);
      vi.mocked(metaGraphApi.exchangeToken).mockResolvedValue('business-token');
      vi.mocked(metaGraphApi.registerPhoneNumber).mockResolvedValue(undefined);
      vi.mocked(metaGraphApi.subscribeWebhooks).mockResolvedValue(undefined);
      vi.mocked(metaGraphApi.setWebhookOverride).mockResolvedValue(undefined);
      vi.mocked(metaGraphApi.getPhoneNumberInfo).mockResolvedValue({
        verifiedName: 'Test Business',
        displayPhoneNumber: '+1234567890',
      } as any);
      vi.mocked(channelRepository.create).mockResolvedValue({ id: 'channel-123' } as any);

      const result = await service.execute({
        agentId: 'agent-1',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        tokenCode: 'code-1',
        companyId: 'company-1',
      });

      expect(result).toEqual({
        channelId: 'channel-123',
        status: 'connected',
        phoneNumberId: 'phone-1',
        displayName: 'Test Business',
      });

      expect(metaGraphApi.exchangeToken).toHaveBeenCalledWith('code-1');
      expect(metaGraphApi.registerPhoneNumber).toHaveBeenCalledWith('phone-1', 'business-token');
      expect(metaGraphApi.subscribeWebhooks).toHaveBeenCalledWith('waba-1', 'business-token');
      expect(metaGraphApi.setWebhookOverride).toHaveBeenCalledWith('phone-1', 'business-token', 'https://example.com/webhook');
      expect(channelRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'connected',
        phoneNumberId: 'phone-1',
      }));
    });
  });

  describe('Uniqueness Check Failures', () => {
    it('should throw ConflictException if already connected to other agent', async () => {
      vi.spyOn(whatsappCore, 'checkPhoneNumberUniqueness').mockReturnValue({
        allowed: false,
        reason: 'already_connected_other_agent',
      });
      vi.mocked(channelRepository.findAll).mockResolvedValue([]);

      await expect(service.execute({
        agentId: 'agent-1',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        tokenCode: 'code-1',
        companyId: 'company-1',
      })).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if already connected to same agent', async () => {
      vi.spyOn(whatsappCore, 'checkPhoneNumberUniqueness').mockReturnValue({
        allowed: false,
        reason: 'already_connected_same_agent',
      });
      vi.mocked(channelRepository.findAll).mockResolvedValue([]);

      await expect(service.execute({
        agentId: 'agent-1',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        tokenCode: 'code-1',
        companyId: 'company-1',
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('Reconnection (UPDATE)', () => {
    it('should update existing channel credentials', async () => {
      vi.spyOn(whatsappCore, 'checkPhoneNumberUniqueness').mockReturnValue({
        allowed: true,
        action: 'update',
        existingChannelId: 'channel-123',
      });
      vi.mocked(channelRepository.findAll).mockResolvedValue([]);
      vi.mocked(metaGraphApi.exchangeToken).mockResolvedValue('business-token');
      vi.mocked(metaGraphApi.getPhoneNumberInfo).mockResolvedValue({
        verifiedName: 'Test Business',
      } as any);
      vi.mocked(channelRepository.updateCredentials).mockResolvedValue({ id: 'channel-123' } as any);

      const result = await service.execute({
        agentId: 'agent-1',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        tokenCode: 'code-1',
        companyId: 'company-1',
      });

      expect(result).toEqual({
        channelId: 'channel-123',
        status: 'connected',
        phoneNumberId: 'phone-1',
        displayName: 'Test Business',
      });

      expect(channelRepository.updateCredentials).toHaveBeenCalledWith('channel-123', expect.any(Object));
      expect(channelRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Subscription Fallback', () => {
    it('should create channel as partially_connected if webhooks fail', async () => {
      vi.spyOn(whatsappCore, 'checkPhoneNumberUniqueness').mockReturnValue({
        allowed: true,
        action: 'create',
      });
      vi.mocked(channelRepository.findAll).mockResolvedValue([]);
      vi.mocked(metaGraphApi.exchangeToken).mockResolvedValue('business-token');
      vi.mocked(metaGraphApi.registerPhoneNumber).mockResolvedValue(undefined);
      vi.mocked(metaGraphApi.subscribeWebhooks).mockRejectedValue(new Error('webhook error'));
      vi.mocked(metaGraphApi.getPhoneNumberInfo).mockResolvedValue({
        verifiedName: 'Test Business',
      } as any);
      vi.mocked(channelRepository.create).mockResolvedValue({ id: 'channel-123' } as any);

      const result = await service.execute({
        agentId: 'agent-1',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        tokenCode: 'code-1',
        companyId: 'company-1',
      });

      expect(result.status).toBe('partially_connected');
      expect(metaGraphApi.subscribeWebhooks).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(channelRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'partially_connected',
      }));
    });
  });
});
