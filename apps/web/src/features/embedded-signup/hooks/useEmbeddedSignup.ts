import { useState, useCallback, useEffect } from 'react';
import { ChannelStatus, ChannelInfo } from '@multibotagents/types';
import { useFacebookSDK } from './useFacebookSDK';
import { EmbeddedSignupService } from '../services/embedded-signup.service';
import { UseEmbeddedSignupReturn } from '../types';

export function useEmbeddedSignup(agentId: string, initialChannel?: ChannelInfo | null): UseEmbeddedSignupReturn {
  const { isLoaded, launchEmbeddedSignup, error: sdkError } = useFacebookSDK();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(initialChannel?.status || null);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(initialChannel || null);

  useEffect(() => {
    if (sdkError) {
      setError(sdkError);
    }
  }, [sdkError]);

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

  const disconnect = useCallback(async () => {
    if (!channelInfo) return;

    setIsConnecting(true);
    setError(null);

    try {
      await EmbeddedSignupService.disconnectWhatsApp(channelInfo.channelId);
      setChannelStatus(null);
      setChannelInfo(null);
    } catch (err: any) {
      setError(err.message || 'Error al desconectar el canal.');
    } finally {
      setIsConnecting(false);
    }
  }, [channelInfo]);

  return {
    connect,
    disconnect,
    isConnecting,
    error,
    channelStatus,
    channelInfo,
  };
}
