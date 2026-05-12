/**
 * Secrets — Configuración sensible para servicios de autenticación.
 *
 * Usa SST Secrets para almacenar valores sensibles de forma segura.
 * Se configuran por stage con: `sst secrets set <KEY> "<value>" --stage <stage>`
 *
 * - JwtSecrets: Array JSON de secrets para firmar/verificar JWT (soporta rotación)
 * - CaptchaSecret: Secret key del servidor de Google reCAPTCHA v2
 * - CaptchaVerifyUrl: URL del endpoint de verificación reCAPTCHA
 * - RecaptchaSiteKey: Site key pública de Google reCAPTCHA v2 (para el frontend)
 */

export const jwtSecrets = new sst.Secret("JwtSecrets");
export const captchaSecret = new sst.Secret("CaptchaSecret");
export const captchaVerifyUrl = new sst.Secret("CaptchaVerifyUrl");
export const recaptchaSiteKey = new sst.Secret("RecaptchaSiteKey");
