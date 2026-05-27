/**
 * Barrel export — módulo whatsapp
 *
 * Re-exporta servicios del dominio de WhatsApp: webhook, cifrado y validación de canales.
 */

export { verifyWebhook } from "./verify-webhook.service";
export { encryptToken, decryptToken } from "./token-encryption";
export {
  checkPhoneNumberUniqueness,
  type ExistingChannel,
  type UniquenessCheckResult,
} from "./channel-validation";
