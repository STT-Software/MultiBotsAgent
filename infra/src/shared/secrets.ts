/**
 * Secrets — Configuración sensible para servicios de autenticación y email.
 *
 * Usa SST Secrets para almacenar valores sensibles de forma segura.
 * Se configuran por stage con: `sst secrets set <KEY> "<value>" --stage <stage>`
 *
 * - JwtSecrets: Array JSON de secrets para firmar/verificar JWT (soporta rotación)
 * - CaptchaSecret: Secret key del servidor de Google reCAPTCHA v2
 * - CaptchaVerifyUrl: URL del endpoint de verificación reCAPTCHA
 * - RecaptchaSiteKey: Site key pública de Google reCAPTCHA v2 (para el frontend)
 * - ElasticEmailApiKey: API key de Elastic Email para envío transaccional
 * - ElasticEmailFromEmail: Email remitente (e.g., noreply@plataforma.com)
 * - ElasticEmailFromName: Nombre remitente (e.g., "Plataforma Agentes")
 * - ElasticEmailTemplateId: ID del template de verificación en Elastic Email
 * - FrontendDomain: Dominio del frontend para construir URLs de verificación
 */

export const jwtSecrets = new sst.Secret("JwtSecrets");
export const captchaSecret = new sst.Secret("CaptchaSecret");
export const captchaVerifyUrl = new sst.Secret("CaptchaVerifyUrl");
export const recaptchaSiteKey = new sst.Secret("RecaptchaSiteKey");

// Elastic Email — Verificación de email
export const elasticEmailApiKey = new sst.Secret("ElasticEmailApiKey");
export const elasticEmailFromEmail = new sst.Secret("ElasticEmailFromEmail");
export const elasticEmailFromName = new sst.Secret("ElasticEmailFromName");
export const elasticEmailTemplateId = new sst.Secret("ElasticEmailTemplateId");

// Elastic Email — Password Recovery
export const elasticEmailPasswordResetTemplateId = new sst.Secret("ElasticEmailPasswordResetTemplateId");

export const frontendDomain = new sst.Secret("FrontendDomain");

// Meta & WhatsApp
export const metaAppId = new sst.Secret("META_APP_ID");
export const metaAppSecret = new sst.Secret("META_APP_SECRET");
export const metaConfigId = new sst.Secret("META_CONFIG_ID");
export const encryptionKey = new sst.Secret("ENCRYPTION_KEY");
