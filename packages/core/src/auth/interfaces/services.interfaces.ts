/**
 * Interfaces de configuración para los servicios de autenticación.
 * Separadas de la implementación para facilitar testing e inyección.
 */
import type { ServiceCategory, CompanySize, ReferralSource } from '@multibotagents/types';

// ─── CaptchaService ──────────────────────────────────────────────────────────

/** Configuración del servicio CAPTCHA. */
export interface CaptchaConfig {
  /** URL del endpoint de verificación (e.g., 'https://hcaptcha.com/siteverify'). */
  verifyUrl?: string;
  /** Secret del servidor para verificación. */
  secret?: string;
}

/** Interfaz para el cliente HTTP (inyectable para testing). */
export interface HttpClient {
  post(url: string, body: Record<string, string>): Promise<{ success: boolean }>;
}

// ─── TokenService ────────────────────────────────────────────────────────────

/** Configuración del TokenService. */
export interface TokenServiceConfig {
  /** Array de secrets para JWT. El primero se usa para firmar, todos para verificar (rotación). */
  secrets: string[];
}

// ─── RegisterValidator ───────────────────────────────────────────────────────

/** Datos de registro validados y sanitizados, listos para procesamiento. */
export interface ValidatedRegisterData {
  companyName: string;
  email: string;
  password: string;
  country: string;
  category: ServiceCategory;
  size: CompanySize;
  phone?: string;
  phoneCountryCode?: string;
  referralSource?: ReferralSource;
  captchaToken?: string;
}
