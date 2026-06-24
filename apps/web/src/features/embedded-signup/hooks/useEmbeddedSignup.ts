import { useState, useCallback, useEffect } from 'react';
import { ChannelStatus, ChannelInfo } from '@multibotagents/types';
import { useFacebookSDK } from './useFacebookSDK';
import { EmbeddedSignupService } from '../services/embedded-signup.service';
import { UseEmbeddedSignupReturn } from '../types';

export function useEmbeddedSignup(agentId: string, initialChannel?: ChannelInfo | null): UseEmbeddedSignupReturn {
  const { isLoaded, launchEmbeddedSignup, error: sdkError } = useFacebookSDK();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(initialChannel?.status || null);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(initialChannel || null);
  const [simulationResult, setSimulationResult] = useState<{ success: boolean; messageId: string } | null>(null);

  // Estados para webhook de Telegram
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [isCheckingWebhook, setIsCheckingWebhook] = useState(false);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);

  useEffect(() => {
    if (sdkError) {
      setError(sdkError);
    }
  }, [sdkError]);

  useEffect(() => {
    let active = true;
    if (!initialChannel) {
      setIsConnecting(true);
      EmbeddedSignupService.getChannelStatus(agentId)
        .then((info) => {
          if (!active) return;
          if (info) {
            setChannelStatus(info.status);
            setChannelInfo(info);
          } else {
            setChannelStatus(null);
            setChannelInfo(null);
          }
        })
        .catch((_err) => {
          if (active) {
            setChannelStatus(null);
            setChannelInfo(null);
          }
        })
        .finally(() => {
          if (active) {
            setIsConnecting(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [agentId, initialChannel]);

  const connect = useCallback(async () => {
    if (!isLoaded) return;

    setIsConnecting(true);
    setError(null);

    try {
      const callbackData = await launchEmbeddedSignup();

      if (!callbackData) {
        // Cancelled by user
        setError('Conexión cancelada.');
        setIsConnecting(false);
        return;
      }

      const response = await EmbeddedSignupService.connectWhatsApp({
        agentId,
        wabaId: callbackData.wabaId,
        phoneNumberId: callbackData.phoneNumberId,
        tokenCode: callbackData.tokenCode,
      });

      setChannelStatus(response.status);
      setChannelInfo({
        channelId: response.channelId,
        status: response.status,
        phoneNumberId: response.phoneNumberId,
        displayName: response.displayName,
        connectedAt: new Date().toISOString(),
      });

      if (response.status === 'partially_connected') {
        setError('La conexión se completó parcialmente. Algunas funcionalidades pueden no estar disponibles.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error interno. Contacta a soporte si persiste.');
    } finally {
      setIsConnecting(false);
    }
  }, [agentId, isLoaded, launchEmbeddedSignup]);

  const connectManual = useCallback(async (wabaId: string, phoneNumberId: string, accessToken: string, pin?: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await EmbeddedSignupService.connectWhatsApp({
        agentId,
        wabaId,
        phoneNumberId,
        accessToken,
        pin,
        tokenCode: '',
      });

      setChannelStatus(response.status);
      setChannelInfo({
        channelId: response.channelId,
        status: response.status,
        phoneNumberId: response.phoneNumberId,
        displayName: response.displayName,
        connectedAt: new Date().toISOString(),
        provider: 'whatsapp',
      });

      if (response.status === 'partially_connected') {
        setError('La conexión manual se completó parcialmente.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al realizar la conexión manual.');
    } finally {
      setIsConnecting(false);
    }
  }, [agentId]);

  const connectTelegram = useCallback(async (botToken: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await EmbeddedSignupService.connectTelegram(agentId, botToken);

      setChannelStatus(response.status);
      setChannelInfo({
        channelId: response.channelId,
        status: response.status,
        telegramBotUsername: response.telegramBotUsername,
        displayName: response.displayName,
        connectedAt: new Date().toISOString(),
        provider: 'telegram',
      });
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al conectar el bot de Telegram.');
    } finally {
      setIsConnecting(false);
    }
  }, [agentId]);

  const simulateMessage = useCallback(async (messageText: string, senderPhoneNumber?: string) => {
    setIsSimulating(true);
    setError(null);
    setSimulationResult(null);

    try {
      const result = await EmbeddedSignupService.simulateWebhook(agentId, messageText, senderPhoneNumber);
      setSimulationResult({
        success: result.success,
        messageId: result.messageId,
      });
    } catch (err: any) {
      setError(err.message || 'Error al simular el mensaje del webhook.');
    } finally {
      setIsSimulating(false);
    }
  }, [agentId]);

  const simulateTelegramMessage = useCallback(async (messageText: string, senderUsername?: string) => {
    setIsSimulating(true);
    setError(null);
    setSimulationResult(null);

    try {
      const result = await EmbeddedSignupService.simulateTelegramWebhook(agentId, messageText, senderUsername);
      setSimulationResult({
        success: result.success,
        messageId: result.messageId,
      });
    } catch (err: any) {
      setError(err.message || 'Error al simular el mensaje de Telegram.');
    } finally {
      setIsSimulating(false);
    }
  }, [agentId]);

  const disconnect = useCallback(async () => {
    if (!channelInfo) return;

    setIsConnecting(true);
    setError(null);

    try {
      await EmbeddedSignupService.disconnectWhatsApp(channelInfo.channelId);
      setChannelStatus(null);
      setChannelInfo(null);
      setSimulationResult(null);
    } catch (err: any) {
      setError(err.message || 'Error al desconectar el canal.');
    } finally {
      setIsConnecting(false);
    }
  }, [channelInfo]);

  const checkWebhookInfo = useCallback(async () => {
    console.log('[Telegram Webhook] checkWebhookInfo triggered for agentId:', agentId);
    setIsCheckingWebhook(true);
    setError(null);
    try {
      const info = await EmbeddedSignupService.getTelegramWebhookInfo(agentId);
      console.log('[Telegram Webhook] checkWebhookInfo success, response data:', info);
      setWebhookInfo(info);
    } catch (err: unknown) {
      console.error('[Telegram Webhook] checkWebhookInfo error caught:', err);
      const errMsg = err instanceof Error ? err.message : 'Error al obtener información del webhook de Telegram.';
      setError(errMsg);
    } finally {
      setIsCheckingWebhook(false);
    }
  }, [agentId]);

  const configureWebhook = useCallback(async (webhookUrl: string) => {
    console.log('[Telegram Webhook] configureWebhook triggered for agentId:', agentId, 'with URL:', webhookUrl);
    setIsConfiguringWebhook(true);
    setError(null);
    try {
      console.log('[Telegram Webhook] Invoking setTelegramWebhook service...');
      const result = await EmbeddedSignupService.setTelegramWebhook(agentId, webhookUrl);
      console.log('[Telegram Webhook] setTelegramWebhook service response result:', result);
      if (result.ok) {
        console.log('[Telegram Webhook] Webhook set successfully. Re-fetching info...');
        const info = await EmbeddedSignupService.getTelegramWebhookInfo(agentId);
        console.log('[Telegram Webhook] Re-fetched info response:', info);
        setWebhookInfo(info);
      } else {
        console.warn('[Telegram Webhook] Webhook set returned ok: false. Result description:', result.description);
        throw new Error(result.description || 'Error al registrar el webhook');
      }
    } catch (err: unknown) {
      console.error('[Telegram Webhook] configureWebhook error caught:', err);
      const errMsg = err instanceof Error ? err.message : 'Error al configurar el webhook de Telegram.';
      setError(errMsg);
    } finally {
      setIsConfiguringWebhook(false);
    }
  }, [agentId]);

  // Si ya viene conectado un canal de telegram al montar, podemos pre-cargar el webhook info
  useEffect(() => {
    if (channelInfo?.provider === 'telegram' && channelStatus === 'connected') {
      checkWebhookInfo();
    }
  }, [channelInfo, channelStatus, checkWebhookInfo]);

  return {
    connect,
    connectManual,
    connectTelegram,
    simulateMessage,
    simulateTelegramMessage,
    disconnect,
    checkWebhookInfo,
    configureWebhook,
    isConnecting,
    isSimulating,
    isCheckingWebhook,
    isConfiguringWebhook,
    error,
    channelStatus,
    channelInfo,
    simulationResult,
    webhookInfo,
  };
}
