import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ConnectWhatsAppService } from '../services/connect-whatsapp.service';
import { MetaGraphApiProvider } from '../providers/meta-graph-api.provider';
import { ChannelRepository } from '@multibotagents/db';
import * as whatsappCore from '@multibotagents/core/whatsapp';
import { Logger } from '@nestjs/common';

/**
 * Feature: embedded-signup, Property 5: El Business Token nunca aparece en texto plano en salidas del sistema
 *
 * Para cualquier token de Business y para cualquier resultado de operación (exitosa o fallida),
 * el valor del token en texto plano no debe aparecer en el cuerpo de la respuesta HTTP,
 * en mensajes de error, ni en los argumentos pasados al logger.
 * Solo el token cifrado (ciphertext) puede existir fuera del contexto de llamadas a Meta Graph API.
 *
 * **Validates: Requirements 7.3, 7.4**
 */
describe('Token Leak Property Test', () => {
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
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'channel-id' }),
      update: vi.fn(),
      updateCredentials: vi.fn(),
    } as unknown as ChannelRepository;

    service = new ConnectWhatsAppService(metaGraphApi, channelRepository);
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(service as any, 'delay').mockResolvedValue(undefined);
  });

  it('el token no debe filtrarse en salidas del servicio ni logs', async () => {
    const loggerLogSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const loggerWarnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const loggerErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    vi.spyOn(whatsappCore, 'checkPhoneNumberUniqueness').mockReturnValue({
      allowed: true,
      action: 'create',
    });

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 20 }), // businessToken
        fc.string({ minLength: 5 }), // tokenCode
        fc.boolean(), // shouldFailWebhook
        async (businessToken, tokenCode, shouldFailWebhook) => {
          vi.mocked(metaGraphApi.exchangeToken).mockResolvedValue(businessToken);
          vi.mocked(metaGraphApi.getPhoneNumberInfo).mockResolvedValue({ verifiedName: 'Business' } as any);
          
          if (shouldFailWebhook) {
            vi.mocked(metaGraphApi.subscribeWebhooks).mockRejectedValue(new Error('webhook error'));
          } else {
            vi.mocked(metaGraphApi.subscribeWebhooks).mockResolvedValue(undefined);
          }

          const result = await service.execute({
            agentId: 'agent',
            wabaId: 'waba',
            phoneNumberId: 'phone',
            tokenCode,
            companyId: 'company',
          });

          // 1. No debe estar en el result
          const resultString = JSON.stringify(result);
          expect(resultString).not.toContain(businessToken);

          // 2. No debe estar en los logs
          const allLogCalls = [...loggerLogSpy.mock.calls, ...loggerWarnSpy.mock.calls, ...loggerErrorSpy.mock.calls];
          for (const call of allLogCalls) {
            for (const arg of call) {
              if (typeof arg === 'string') {
                expect(arg).not.toContain(businessToken);
              }
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
