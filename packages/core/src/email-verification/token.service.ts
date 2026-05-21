/**
 * TokenService — Servicio de generación y validación de tokens de verificación de email.
 *
 * Responsabilidades:
 * - Generar tokens de verificación criptográficamente seguros (256 bits de entropía)
 * - Validar el formato de tokens (hex de 64 caracteres)
 *
 * Este servicio es lógica pura sin dependencias externas.
 * Validates: Requirements 1.1, 1.4, 4.5
 */
import crypto from 'crypto';

export class TokenService {
  /**
   * Genera un token de verificación criptográficamente seguro.
   * Usa exclusivamente crypto.randomBytes(32) — 256 bits de entropía,
   * resultando en 64 caracteres hexadecimales.
   *
   * @returns Token hexadecimal de 64 caracteres
   * Validates: Requirements 1.1, 1.4
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Valida que un token tenga el formato correcto: exactamente 64 caracteres
   * hexadecimales en minúscula [0-9a-f].
   *
   * @param token - String a validar
   * @returns true si el token es hex de 64 caracteres, false en caso contrario
   * Validates: Requirement 4.5
   */
  validateTokenFormat(token: string): boolean {
    return /^[0-9a-f]{64}$/.test(token);
  }
}
