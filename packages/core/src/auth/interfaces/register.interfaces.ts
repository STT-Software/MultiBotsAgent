import type {
  CompanySize,
  ServiceCategory,
  ReferralSource,
  CompanyStatus,
  EmailTemplate,
  EmailQueueStatus,
} from '@multibotagents/types';
import type { PasswordService } from '../password.service';
import type { TokenService } from '../token.service';
import type { CaptchaService } from '../captcha.service';

// ─── Transaction ─────────────────────────────────────────────────────────────

/** Interfaz genérica de sesión de transacción. */
export interface TransactionSession {
  startTransaction(): void;
  commitTransaction(): Promise<void>;
  abortTransaction(): Promise<void>;
  endSession(): Promise<void>;
}

// ─── Data Transfer Objects ───────────────────────────────────────────────────

/** Datos para crear una Company. */
export interface CreateCompanyData {
  name: string;
  country: string;
  category: ServiceCategory;
  size: CompanySize;
  phone?: string;
  referralSource?: ReferralSource;
  status: CompanyStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Datos para crear un User. */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Datos para crear un RefreshToken. */
export interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

/** Datos para encolar un email. */
export interface EnqueueEmailData {
  to: string;
  template: EmailTemplate;
  payload: Record<string, unknown>;
  status: EmailQueueStatus;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Entities ────────────────────────────────────────────────────────────────

/** Entidad Company retornada por el repositorio. */
export interface CompanyEntity {
  id: string;
  name: string;
}

/** Entidad User retornada por el repositorio. */
export interface UserEntity {
  id: string;
  email: string;
  emailVerified: boolean;
  companyId: string;
}

// ─── Repository Interfaces ───────────────────────────────────────────────────

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  createWithSession(data: CreateUserData, session: TransactionSession): Promise<UserEntity>;
}

export interface ICompanyRepository {
  createWithSession(data: CreateCompanyData, session: TransactionSession): Promise<CompanyEntity>;
}

export interface IRefreshTokenRepository {
  createWithSession(data: CreateRefreshTokenData, session: TransactionSession): Promise<{ id: string }>;
  revokeAllByUserId(userId: string, session: TransactionSession): Promise<void>;
}

export interface IVerifyTokenRepository {
  createForUser(userId: string, type: string, token: string): Promise<{ id: string }>;
}

export interface IEmailQueueRepository {
  enqueue(item: EnqueueEmailData): Promise<{ id: string }>;
}

// ─── Logger ──────────────────────────────────────────────────────────────────

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

// ─── Service Dependencies ────────────────────────────────────────────────────

export interface RegisterServiceDeps {
  userRepository: IUserRepository;
  companyRepository: ICompanyRepository;
  refreshTokenRepository: IRefreshTokenRepository;
  verifyTokenRepository: IVerifyTokenRepository;
  emailQueueRepository: IEmailQueueRepository;
  passwordService: PasswordService;
  tokenService: TokenService;
  captchaService: CaptchaService;
  getSession: () => Promise<TransactionSession>;
  logger: Logger;
}
