import { ConnectWhatsAppRequest, ConnectWhatsAppResponse, ChannelInfo } from '@multibotagents/types';

/**
 * Servicio para interactuar con la API de canales de WhatsApp.
 */
export class EmbeddedSignupService {
  /**
   * Envía los datos del Embedded Signup al backend para completar la conexión.
   */
  static async connectWhatsApp(request: ConnectWhatsAppRequest): Promise<ConnectWhatsAppResponse> {
    const response = await fetch('/api/channels/whatsapp/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = 'Error de conexión';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Ignorar error si no es JSON
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Obtiene el estado actual del canal del agente.
   */
  static async getChannelStatus(agentId: string): Promise<ChannelInfo | null> {
    const response = await fetch(`/api/channels/whatsapp/status?agentId=${agentId}`);
    
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Error al obtener el estado del canal');
    }

    return response.json();
  }

  /**
   * Desconecta un canal de WhatsApp.
   */
  static async disconnectWhatsApp(channelId: string): Promise<void> {
    const response = await fetch('/api/channels/whatsapp/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelId }),
    });

    if (!response.ok) {
      throw new Error('Error al desconectar el canal');
    }
  }
}
