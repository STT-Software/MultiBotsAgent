/**
 * Secrets — Configuración sensible para servicios de autenticación.
 *
 * Usa SST Secrets para almacenar valores sensibles de forma segura.
 * Se configuran por stage con: `sst secrets set <KEY> "<value>" --stage <stage>`
 *
 * - JwtSecrets: Array JSON de secrets para firmar/verificar JWT (soporta rotación)
 * - CaptchaSecret: Secret key del servicio CAPTCHA (hCaptcha/Turnstile)
 * - CaptchaVerifyUrl: URL del endpoint de verificación CAPTCHA
 */

export const jwtSecrets = new sst.Secret("JwtSecrets");
export const captchaSecret = new sst.Secret("CaptchaSecret");
export const captchaVerifyUrl = new sst.Secret("CaptchaVerifyUrl");
