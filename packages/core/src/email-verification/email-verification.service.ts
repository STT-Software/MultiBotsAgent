/**
 * EmailVerificationService — Servicio principal de verificación de email.
 *
 * Orquesta la validación de tokens, reenvío de verificación y evaluación de acceso.
 * Lógica pura de negocio sin dependencias de AWS.
 *
 * Validates: Requirements 4.1, 4.5, 4.6, 4.7, 4.8, 4.10, 5.2, 5.3, 5.5, 5.6, 5.8, 6.6
 */
import type { VerifyToken, User, VerifyTokenType } from '@multibotagents/types';
import type { TokenService } from './token.service';
import {
  TokenInvalidError,
  TokenExpiredError,
  TokenAlreadyUsedError,
  AlreadyVerifiedError,
  ResendCooldownError,
} from './errors';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** Interfaz genérica de sesión de transacción. */
interface TransactionSession {
  startTransaction(): void;
  commitTransaction(): Promise<void>;
  abortTransaction(): Promise<void>;
  endSession(): Promise<void>;
}

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

export interface IVerifyTokenRepository {
  createForUser(userId: string, type: VerifyTokenType, token: string): Promise<VerifyToken>;
  findAndMarkUsed(token: string): Promise<VerifyToken | null>;
  invalidateAllByUserAndType(userId: string, type: VerifyTokenType): Promise<void>;
  findByToken(token: string): Promise<VerifyToken | null>;
  findLatestByUserAndType(userId: string, type: VerifyTokenType): Promise<VerifyToken | null>;
}

export interface IEmailQueueRepository {
  enqueue(item: EnqueueEmailData): Promise<{ id: string }>;
}

export interface IUserRepository {
  findById(userId: string): Promise<User | null>;
  markEmailVerified(userId: string): Promise<void>;
}

interface EnqueueEmailData {
  to: string;
  template: string;
  payload: Record<string, unknown>;
}

// ─── Config & Results ────────────────────────────────────────────────────────

export interface EmailVerificationConfig {
  /** Dominio del frontend para construir URLs de verificación. */
  frontendDomain: string;
  /** TTL del token de verificación en ms (default: 24h). */
  tokenTtlMs: number;
  /** Cooldown entre reenvíos en ms (default: 60s). */
  resendCooldownMs: number;
}

export interface EmailVerificationServiceDeps {
  verifyTokenRepository: IVerifyTokenRepository;
  emailQueueRepository: IEmailQueueRepository;
  userRepository: IUserRepository;
  tokenService: TokenService;
  getSession: () => Promise<TransactionSession>;
  logger: Logger;
  config: EmailVerificationConfig;
}

export interface VerifyTokenResult {
  success: true;
  userId: string;
}

export interface ResendResult {
  success: true;
  email: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class EmailVerificationService {
  private readonly verifyTokenRepository: IVerifyTokenRepository;
  private readonly emailQueueRepository: IEmailQueueRepository;
  private readonly userRepository: IUserRepository;
  private readonly tokenService: TokenService;
  private readonly logger: Logger;
  private readonly config: EmailVerificationConfig;

  constructor(deps: EmailVerificationServiceDeps) {
    this.verifyTokenRepository = deps.verifyTokenRepository;
    this.emailQueueRepository = deps.emailQueueRepository;
    this.userRepository = deps.userRepository;
    this.tokenService = deps.tokenService;
    this.logger = deps.logger;
    this.config = deps.config;
  }

  /**
   * Valida un token de verificación y marca el email como verificado.
   * Operación atómica: findAndMarkUsed garantiza que solo una invocación
   * concurrente obtiene el documento.
   *
   * Validates: Requirements 4.1, 4.5, 4.6, 4.7, 4.8, 4.10
   */
  async verifyToken(token: string): Promise<VerifyTokenResult> {
    // 1. Validar formato del token (hex 64 chars)
    if (!this.tokenService.validateTokenFormat(token)) {
      throw new TokenInvalidError();
    }

    // 2. Buscar y marcar como usado atómicamente
    //    findAndMarkUsed filtra: {token, usedAt: null, expiresAt > now}
    //    Si retorna null, el token no existe, ya fue usado, o expiró
    const tokenDoc = await this.verifyTokenRepository.findAndMarkUsed(token);

    if (!tokenDoc) {
      // Intentar determinar la razón específica del fallo
      const existingToken = await this.verifyTokenRepository.findByToken(token);

      if (!existingToken) {
        throw new TokenInvalidError();
      }

      if (existingToken.usedAt) {
        throw new TokenAlreadyUsedError();
      }

      if (existingToken.expiresAt < new Date()) {
        throw new TokenExpiredError(existingToken.userId);
      }

      // Fallback: token inválido por razón desconocida
      throw new TokenInvalidError();
    }

    // 3. Marcar email como verificado
    await this.userRepository.markEmailVerified(tokenDoc.userId);

    this.logger.info('Email verified successfully', {
      userId: tokenDoc.userId,
      tokenId: tokenDoc.id,
    });

    return { success: true, userId: tokenDoc.userId };
  }

  /**
   * Reenvía el email de verificación. Invalida tokens previos y genera uno nuevo.
   * Requiere userId (usuario autenticado) o expiredToken (desde página de token expirado).
   *
   * Validates: Requirements 5.2, 5.3, 5.5, 5.6, 5.8
   */
  async resendVerification(params: {
    userId?: string;
    expiredToken?: string;
  }): Promise<ResendResult> {
    let userId: string;

    // 1. Determinar userId
    if (params.userId) {
      userId = params.userId;
    } else if (params.expiredToken) {
      const tokenDoc = await this.verifyTokenRepository.findByToken(params.expiredToken);
      if (!tokenDoc) {
        throw new TokenInvalidError();
      }
      userId = tokenDoc.userId;
    } else {
      throw new TokenInvalidError('Se requiere userId o expiredToken');
    }

    // 2. Verificar que el usuario existe y no está ya verificado
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new TokenInvalidError('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new AlreadyVerifiedError();
    }

    // 3. Verificar cooldown: buscar último token creado
    const latestToken = await this.verifyTokenRepository.findLatestByUserAndType(
      userId,
      'email_verification' as VerifyTokenType,
    );

    if (latestToken) {
      const elapsedMs = Date.now() - latestToken.createdAt.getTime();
      if (elapsedMs < this.config.resendCooldownMs) {
        const retryAfterSeconds = Math.ceil(
          (this.config.resendCooldownMs - elapsedMs) / 1000,
        );
        throw new ResendCooldownError(retryAfterSeconds);
      }
    }

    // 4. Invalidar todos los tokens previos de verificación
    await this.verifyTokenRepository.invalidateAllByUserAndType(
      userId,
      'email_verification' as VerifyTokenType,
    );

    // 5. Generar nuevo token
    const newToken = this.tokenService.generateVerificationToken();

    // 6. Crear nuevo token en BD
    await this.verifyTokenRepository.createForUser(
      userId,
      'email_verification' as VerifyTokenType,
      newToken,
    );

    // 7. Construir URL de verificación
    const verificationUrl = `${this.config.frontendDomain}/verify-email?token=${newToken}`;

    // 8. Encolar email de verificación
    await this.emailQueueRepository.enqueue({
      to: user.email,
      template: 'verification',
      payload: {
        token: newToken,
        url: verificationUrl,
        username: user.email.split('@')[0] || 'Usuario',
      },
    });

    this.logger.info('Verification email resent', {
      userId,
      email: user.email,
    });

    return { success: true, email: user.email };
  }

  /**
   * Evalúa si un usuario tiene el email verificado.
   * Usado por el middleware de acceso.
   *
   * Validates: Requirement 6.6
   */
  isEmailVerified(emailVerified: boolean): boolean {
    return emailVerified;
  }
}
