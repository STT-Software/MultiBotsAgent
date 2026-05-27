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

  return {
    connect,
    connectManual,
    simulateMessage,
    disconnect,
    isConnecting,
    isSimulating,
    error,
    channelStatus,
    channelInfo,
    simulationResult,
  };
}
