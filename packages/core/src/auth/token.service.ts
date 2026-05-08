/**
 * Servicio de generación y verificación de tokens.
 *
 * Responsabilidades:
 * - Generar Access Tokens JWT (HS256, 30 min)
 * - Verificar Access Tokens con soporte de rotación de secrets
 * - Generar Refresh Tokens (crypto.randomBytes(64))
 * - Generar Verification Tokens (crypto.randomBytes(32))
 *
 * Falla con TokenGenerationError si crypto no está disponible.
 * Este módulo es lógica pura sin dependencias de AWS.
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { AccessTokenPayload } from '@multibotagents/types';
import { TokenGenerationError } from '@multibotagents/types';

/** Expiración del Access Token en segundos (30 minutos). */
const ACCESS_TOKEN_EXPIRATION = '30m';

/** Configuración del TokenService. */
export interface TokenServiceConfig {
  /** Array de secrets para JWT. El primero se usa para firmar, todos para verificar (rotación). */
  secrets: string[];
}

export class TokenService {
  private readonly secrets: string[];

  constructor(config: TokenServiceConfig) {
    if (!config.secrets || config.secrets.length === 0) {
      throw new Error('At least one JWT secret is required');
    }
    this.secrets = config.secrets;
  }

  /**
   * Genera un Access Token JWT firmado con HS256.
   * Usa el primer secret del array para firmar.
   * @param payload - Claims del token (userId, companyId, email, emailVerified)
   * @returns JWT firmado con expiración de 30 minutos
   */
  generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.secrets[0], {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_EXPIRATION,
    });
  }

  /**
   * Verifica un Access Token JWT con soporte de rotación de secrets.
   * Intenta verificar con el secret actual primero, luego con los anteriores.
   * @param token - JWT a verificar
   * @returns Payload decodificado si el token es válido
   * @throws Error si el token no es válido con ningún secret
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    for (const secret of this.secrets) {
      try {
        const decoded = jwt.verify(token, secret, {
          algorithms: ['HS256'],
        }) as AccessTokenPayload & { iat: number; exp: number };

        return {
          userId: decoded.userId,
          companyId: decoded.companyId,
          email: decoded.email,
          emailVerified: decoded.emailVerified,
        };
      } catch {
        // Try next secret
        continue;
      }
    }
    throw new Error('Invalid or expired token');
  }

  /**
   * Genera un Refresh Token opaco usando crypto.randomBytes(64).
   * @returns Token hexadecimal de 128 caracteres (64 bytes)
   * @throws {TokenGenerationError} Si crypto.randomBytes no está disponible
   */
  generateRefreshToken(): string {
    try {
      return crypto.randomBytes(64).toString('hex');
    } catch {
      throw new TokenGenerationError();
    }
  }

  /**
   * Genera un Verification Token usando crypto.randomBytes(32).
   * @returns Token hexadecimal de 64 caracteres (32 bytes)
   * @throws {TokenGenerationError} Si crypto.randomBytes no está disponible
   */
  generateVerificationToken(): string {
    try {
      return crypto.randomBytes(32).toString('hex');
    } catch {
      throw new TokenGenerationError();
    }
  }
}
