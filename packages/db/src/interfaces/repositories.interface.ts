/**
 * Interfaces de los repositorios de la capa de datos.
 * Define contratos específicos de cada repositorio con sus DTOs de entrada.
 *
 * Estas interfaces usan ClientSession de MongoDB directamente porque
 * son contratos de la capa de infraestructura (no de dominio).
 */
import type { ClientSession } from 'mongodb';
import type {
  Company,
  User,
  RefreshToken,
  VerifyToken,
  VerifyTokenType,
  EmailQueueItem,
  EmailTemplate,
} from '@multibotagents/types';
import type { Repository } from './repository.interface';

// ─── Company ─────────────────────────────────────────────────────────────────

/** Datos necesarios para crear una empresa dentro de una transacción. */
export interface CreateCompanyData {
  name: string;
  country: string;
  category: string;
  size: string;
  phone?: string;
  referralSource?: string;
}

export interface ICompanyRepository extends Repository<Company> {
  createWithSession(data: CreateCompanyData, session: ClientSession): Promise<Company>;
}

// ─── User ────────────────────────────────────────────────────────────────────

/** Datos necesarios para crear un usuario dentro de una transacción. */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  companyId: string;
}

export interface IUserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
  createWithSession(data: CreateUserData, session: ClientSession): Promise<User>;
  markEmailVerified(userId: string): Promise<void>;
}

// ─── RefreshToken ────────────────────────────────────────────────────────────

/** Datos necesarios para crear un refresh token dentro de una transacción. */
export interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface IRefreshTokenRepository extends Repository<RefreshToken> {
  createWithSession(data: CreateRefreshTokenData, session: ClientSession): Promise<RefreshToken>;
  revokeAllByUserId(userId: string, session: ClientSession): Promise<void>;
}

// ─── VerifyToken ─────────────────────────────────────────────────────────────

export interface IVerifyTokenRepository extends Repository<VerifyToken> {
  /** Crea un token de verificación para un usuario. Calcula expiresAt según el tipo. */
  createForUser(userId: string, type: VerifyTokenType, token: string): Promise<VerifyToken>;

  /** Crea un token de verificación dentro de una transacción. */
  createForUserWithSession(userId: string, type: VerifyTokenType, token: string, session: ClientSession): Promise<VerifyToken>;

  /** Busca y marca un token como usado atómicamente. Retorna null si no existe, expirado o ya usado. */
  findAndMarkUsed(token: string): Promise<VerifyToken | null>;

  /** Invalida todos los tokens de un tipo para un usuario (marca usedAt = now). */
  invalidateAllByUserAndType(userId: string, type: VerifyTokenType): Promise<void>;

  /** Busca un token por su valor (para obtener userId de token expirado). */
  findByToken(token: string): Promise<VerifyToken | null>;

  /** Obtiene el último token creado para un usuario y tipo. */
  findLatestByUserAndType(userId: string, type: VerifyTokenType): Promise<VerifyToken | null>;
}

// ─── EmailQueue ──────────────────────────────────────────────────────────────

/** Datos necesarios para encolar un email. */
export interface EnqueueEmailData {
  to: string;
  template: EmailTemplate;
  payload: Record<string, unknown>;
}

export interface IEmailQueueRepository extends Repository<EmailQueueItem> {
  /** Encola un nuevo email para envío. */
  enqueue(item: EnqueueEmailData): Promise<EmailQueueItem>;

  /** Encola un nuevo email para envío dentro de una transacción. */
  enqueueWithSession(item: EnqueueEmailData, session: ClientSession): Promise<EmailQueueItem>;

  /** Obtiene documentos elegibles para procesamiento (pending o failed con nextRetryAt <= now). */
  findEligible(limit: number): Promise<EmailQueueItem[]>;

  /** Toma un documento para procesamiento con lock atómico (findOneAndUpdate). */
  takeForProcessing(id: string, currentStatus: string): Promise<EmailQueueItem | null>;

  /** Marca un documento como enviado exitosamente. */
  markSent(id: string): Promise<void>;

  /** Marca un documento como fallido con información de retry. */
  markFailed(id: string, error: string, nextRetryAt: Date | null, attempts: number): Promise<void>;

  /** Cuenta documentos por status. */
  countByStatus(status: string): Promise<number>;

  /** Calcula tiempo promedio en cola de documentos pendientes (en ms). */
  avgQueueTime(): Promise<number>;

  /** Resetea documentos stuck en estado 'processing' por más de timeoutMs. */
  resetStuckDocuments(timeoutMs: number): Promise<void>;
}
