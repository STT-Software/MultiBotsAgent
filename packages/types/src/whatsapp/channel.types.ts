/**
 * Tipos para el flujo de Embedded Signup y gestión de canales de WhatsApp.
 *
 * Estos tipos definen el contrato entre frontend y backend para la conexión
 * de un número de WhatsApp a un agente de la plataforma.
 */

/**
 * Estados posibles de un canal de WhatsApp.
 *
 * - connected: Canal operativo, puede enviar y recibir mensajes.
 * - disconnected: Canal desconectado, requiere nueva conexión.
 * - requires_reconnection: Credenciales expiradas o revocadas, requiere reconexión.
 * - partially_connected: Conexión parcial (ej: webhooks no suscritos).
 */
export type ChannelStatus =
  | "connected"
  | "disconnected"
  | "requires_reconnection"
  | "partially_connected";

/**
 * Proveedor del canal. Preparado para futura extensión a otros proveedores.
 */
export type ChannelProvider = "whatsapp";

/**
 * Token de acceso cifrado con AES-256-GCM.
 * Se almacena en MongoDB y solo se descifra al momento de llamar a Meta Graph API.
 */
export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Entidad Channel que representa la conexión entre un agente y un número de WhatsApp.
 */
export interface Channel {
  id: string;
  companyId: string;
  agentId: string;
  provider: ChannelProvider;
  status: ChannelStatus;
  phoneNumberId: string;
  wabaId: string;
  encryptedToken: EncryptedToken;
  displayName: string;
  webhookOverrideUrl?: string;
  connectedAt: Date;
  lastHealthCheck?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload de la solicitud POST /api/channels/whatsapp/connect.
 * Enviado por el frontend al backend después de completar el flujo de Embedded Signup.
 */
export interface ConnectWhatsAppRequest {
  agentId: string;
  wabaId: string;
  phoneNumberId: string;
  tokenCode: string;
  accessToken?: string;
  pin?: string;
}

/**
 * Respuesta exitosa del backend al conectar un canal de WhatsApp.
 */
export interface ConnectWhatsAppResponse {
  channelId: string;
  status: "connected" | "partially_connected";
  phoneNumberId: string;
  displayName: string;
}

/**
 * Información resumida de un canal para mostrar en el frontend.
 */
export interface ChannelInfo {
  channelId: string;
  status: ChannelStatus;
  phoneNumberId: string;
  displayName: string;
  connectedAt: string;
}

/**
 * Datos extraídos del callback de Meta al completar el flujo de Embedded Signup.
 */
export interface EmbeddedSignupCallbackData {
  wabaId: string;
  phoneNumberId: string;
  tokenCode: string;
}
