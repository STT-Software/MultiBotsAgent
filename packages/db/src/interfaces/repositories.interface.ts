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
  createForUser(userId: string, type: VerifyTokenType, token: string): Promise<VerifyToken>;
}

// ─── EmailQueue ──────────────────────────────────────────────────────────────

/** Datos necesarios para encolar un email. */
export interface EnqueueEmailData {
  to: string;
  template: EmailTemplate;
  payload: Record<string, unknown>;
}

export interface IEmailQueueRepository extends Repository<EmailQueueItem> {
  enqueue(item: EnqueueEmailData): Promise<EmailQueueItem>;
}
