/**
 * Tipos del dominio de registro de empresa y usuario.
 * Define enums, DTOs e interfaces de entidades para el flujo POST /auth/register.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** Tamaño de la empresa (número de empleados). */
export enum CompanySize {
  ONE = '1',
  TWO_TO_FIVE = '2-5',
  SIX_TO_TEN = '6-10',
  ELEVEN_TO_TWENTY = '11-20',
  TWENTY_PLUS = '20+',
}

/** Fuente por la cual el usuario conoció la plataforma. */
export enum ReferralSource {
  YOUTUBE = 'youtube',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  GOOGLE = 'google',
  REFERRAL = 'referido',
  OTHER = 'otro',
}

/** Categoría de servicios que ofrece la empresa en la plataforma de agentes conversacionales. */
export enum ServiceCategory {
  CUSTOMER_SUPPORT = 'customer_support',
  SALES = 'sales',
  MARKETING = 'marketing',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  REAL_ESTATE = 'real_estate',
  ECOMMERCE = 'ecommerce',
  FINANCE = 'finance',
  HOSPITALITY = 'hospitality',
  LEGAL = 'legal',
  LOGISTICS = 'logistics',
  OTHER = 'other',
}

/** Estado de la empresa dentro de la plataforma. */
export enum CompanyStatus {
  ACTIVE = 'active',
  PENDING_DELETION = 'pending_deletion',
}

/** Tipo de token de verificación. */
export enum VerifyTokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

/** Template de email disponible para la cola. */
export enum EmailTemplate {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password_reset',
}

/** Estado de un item en la cola de email. */
export enum EmailQueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

/** Datos de entrada para el registro de empresa y usuario. */
export interface RegisterDto {
  /** Nombre de la empresa. */
  companyName: string;
  /** Email del usuario (se normaliza a minúsculas). */
  email: string;
  /** Contraseña en texto plano (mín. 8 caracteres, 1 mayúscula, 1 número). */
  password: string;
  /** Código de país ISO 3166-1 alpha-2. */
  country: string;
  /** Categoría de servicios de la empresa. */
  category: ServiceCategory;
  /** Tamaño de la empresa. */
  size: CompanySize;
  /** Teléfono fijo (opcional). */
  phone?: string;
  /** Código de país del teléfono (opcional). */
  phoneCountryCode?: string;
  /** Fuente de referencia (opcional). */
  referralSource?: ReferralSource;
  /** Token CAPTCHA del challenge del frontend (opcional). */
  captchaToken?: string;
}

// ─── Resultado del Registro ──────────────────────────────────────────────────

/** Resultado exitoso del flujo de registro. */
export interface RegisterResult {
  /** JWT de acceso (HS256, expiración 30 min). */
  accessToken: string;
  /** Token opaco de refresh (128 caracteres hex). */
  refreshToken: string;
  /** Datos básicos del usuario creado. */
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
  /** Datos básicos de la empresa creada. */
  company: {
    id: string;
    name: string;
  };
}

// ─── Access Token Payload ────────────────────────────────────────────────────

/** Claims contenidos en el Access Token JWT. */
export interface AccessTokenPayload {
  /** ID del usuario. */
  userId: string;
  /** ID de la empresa asociada. */
  companyId: string;
  /** Email del usuario. */
  email: string;
  /** Si el email ha sido verificado. */
  emailVerified: boolean;
}

// ─── Entidades ───────────────────────────────────────────────────────────────

/** Entidad Company (empresa/tenant). */
export interface Company {
  /** Identificador único. */
  id: string;
  /** Nombre de la empresa. */
  name: string;
  /** Código de país ISO 3166-1 alpha-2. */
  country: string;
  /** Categoría de servicios. */
  category: ServiceCategory;
  /** Tamaño de la empresa. */
  size: CompanySize;
  /** Teléfono con código de país. */
  phone?: string;
  /** URL del logo (S3). */
  logo?: string;
  /** Fuente de referencia. */
  referralSource?: ReferralSource;
  /** Estado de la empresa. */
  status: CompanyStatus;
  /** Fecha de solicitud de eliminación. */
  deletionReqDate?: Date;
  /** Timestamp de creación. */
  createdAt: Date;
  /** Timestamp de última actualización. */
  updatedAt: Date;
}

/** Entidad User (usuario asociado a una empresa). */
export interface User {
  /** Identificador único. */
  id: string;
  /** Email normalizado a minúsculas. */
  email: string;
  /** Hash bcrypt de la contraseña (cost factor 12). */
  passwordHash: string;
  /** Si el email ha sido verificado. */
  emailVerified: boolean;
  /** ID de la empresa asociada. */
  companyId: string;
  /** ID de la sesión activa. */
  activeSessionId?: string;
  /** Timestamp de creación. */
  createdAt: Date;
  /** Timestamp de última actualización. */
  updatedAt: Date;
}

/** Entidad RefreshToken. */
export interface RefreshToken {
  /** Identificador único. */
  id: string;
  /** ID del usuario propietario. */
  userId: string;
  /** Token opaco (crypto.randomBytes(64).toString('hex')). */
  token: string;
  /** Fecha de expiración (7 días desde creación). */
  expiresAt: Date;
  /** Si el token fue revocado. */
  revoked: boolean;
  /** Timestamp de creación. */
  createdAt: Date;
}

/** Entidad VerifyToken (verificación de email o reset de contraseña). */
export interface VerifyToken {
  /** Identificador único. */
  id: string;
  /** ID del usuario propietario. */
  userId: string;
  /** Tipo de token. */
  type: VerifyTokenType;
  /** Token (crypto.randomBytes(32).toString('hex')). */
  token: string;
  /** Fecha de expiración (24h para verificación, 1h para reset). */
  expiresAt: Date;
  /** Fecha de uso (null si no usado). */
  usedAt?: Date;
  /** Timestamp de creación. */
  createdAt: Date;
}

/** Entidad EmailQueueItem (item en la cola de emails). */
export interface EmailQueueItem {
  /** Identificador único. */
  id: string;
  /** Email destino. */
  to: string;
  /** Template de email a usar. */
  template: EmailTemplate;
  /** Datos para el template (token, URL, nombre, etc.). */
  payload: Record<string, unknown>;
  /** Estado del envío. */
  status: EmailQueueStatus;
  /** Número de intentos realizados. */
  attempts: number;
  /** Fecha del próximo reintento. */
  nextRetryAt?: Date;
  /** Último error registrado. */
  lastError?: string;
  /** Timestamp de creación. */
  createdAt: Date;
  /** Timestamp de última actualización. */
  updatedAt: Date;
}
