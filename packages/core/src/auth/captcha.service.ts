/**
 * Servicio de verificación CAPTCHA.
 *
 * Responsabilidades:
 * - Verificar tokens CAPTCHA contra servicio externo (hCaptcha/Turnstile)
 * - Skip silencioso si no hay configuración (entorno de desarrollo)
 * - Lanzar CaptchaError si la verificación falla
 *
 * Este módulo es lógica pura sin dependencias de AWS.
 */
import { CaptchaError } from '@multibotagents/types';
import type { CaptchaConfig, HttpClient } from './interfaces';

/** Cliente HTTP por defecto usando fetch. */
const defaultHttpClient: HttpClient = {
  async post(url: string, body: Record<string, string>): Promise<{ success: boolean }> {
    const formData = new URLSearchParams(body);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    return response.json() as Promise<{ success: boolean }>;
  },
};

export class CaptchaService {
  private readonly config: CaptchaConfig;
  private readonly httpClient: HttpClient;

  constructor(config: CaptchaConfig = {}, httpClient?: HttpClient) {
    this.config = config;
    this.httpClient = httpClient ?? defaultHttpClient;
  }

  /**
   * Verifica el token CAPTCHA contra el servicio externo.
   *
   * - Si no hay configuración (sin verifyUrl o secret), skip silencioso.
   * - Si hay configuración y el token es inválido/ausente, lanza CaptchaError.
   *
   * @param token - Token CAPTCHA del frontend (puede ser undefined)
   * @throws {CaptchaError} Si la verificación falla
   */
  async verify(token: string | undefined): Promise<void> {
    // Skip silencioso si no hay configuración
    if (!this.config.verifyUrl || !this.config.secret) {
      return;
    }

    // Si hay configuración pero no hay token, rechazar
    if (!token) {
      throw new CaptchaError();
    }

    try {
      const result = await this.httpClient.post(this.config.verifyUrl, {
        secret: this.config.secret,
        response: token,
      });

      if (!result.success) {
        throw new CaptchaError();
      }
    } catch (error) {
      if (error instanceof CaptchaError) {
        throw error;
      }
      // Error de red u otro error inesperado — tratar como fallo de CAPTCHA
      throw new CaptchaError();
    }
  }
}
