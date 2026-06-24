/**
 * Servicio de autenticación (login).
 *
 * Flujo: normalizar email → buscar usuario → verificar password → verificar
 *        company status → revocar tokens previos → generar refresh token →
 *        crear registro en BD → actualizar activeSessionId → generar access token
 *
 * Maneja:
 * - Timing attack prevention con DUMMY_HASH para emails inexistentes
 * - Errores de dominio tipados (InvalidCredentials, CompanyPendingDeletion)
 * - Sesión única por usuario (revoca tokens previos)
 *
 * Este módulo es lógica pura sin dependencias de AWS ni MongoDB.
 */
import type {
  LoginResult,
  AccessTokenPayload,
  User,
  Company,
} from '@multibotagents/types';
import {
  InvalidCredentialsError,
  CompanyPendingDeletionError,
  CompanyStatus,
} from '@multibotagents/types';
import type { PasswordService } from './password.service';
import type { TokenService } from './token.service';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Hash bcrypt pre-computado usado para timing attack prevention.
 * Cuando un email no existe, se verifica la contraseña contra este hash
 * para que el tiempo de respuesta sea indistinguible del caso de email válido.
 */
const DUMMY_HASH = '$2a$12$LJ3m4sMKfXzMEOI9GnaKKeFSy6IIbFFAS0a0Gt/RBb90rl3L/.6DS';

/** Refresh token expiration: 7 days in milliseconds. */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Repository Interfaces ───────────────────────────────────────────────────

/** Interfaz simplificada del repositorio de usuarios para LoginService. */
export interface ILoginUserRepository {
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<void>;
}

/** Interfaz simplificada del repositorio de empresas para LoginService. */
export interface ILoginCompanyRepository {
  findById(id: string): Promise<Company | null>;
}

/** Datos para crear un RefreshToken (sin sesión de transacción). */
export interface LoginCreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

/** Interfaz simplificada del repositorio de refresh tokens para LoginService. */
export interface ILoginRefreshTokenRepository {
  revokeAllByUserId(userId: string): Promise<void>;
  create(data: LoginCreateRefreshTokenData): Promise<{ id: string }>;
}

// ─── Service Dependencies ────────────────────────────────────────────────────

export interface LoginServiceDeps {
  userRepository: ILoginUserRepository;
  companyRepository: ILoginCompanyRepository;
  refreshTokenRepository: ILoginRefreshTokenRepository;
  passwordService: PasswordService;
  tokenService: TokenService;
}

// ─── LoginService ────────────────────────────────────────────────────────────

export class LoginService {
  private readonly deps: LoginServiceDeps;

  constructor(deps: LoginServiceDeps) {
    this.deps = deps;
  }

  /**
   * Ejecuta el flujo completo de login.
   *
   * @param email - Email del usuario (se normaliza a minúsculas)
   * @param password - Contraseña en texto plano
   * @returns Resultado con access token, refresh token y datos del usuario
   * @throws {InvalidCredentialsError} Si el email no existe o la contraseña es incorrecta
   * @throws {CompanyPendingDeletionError} Si la empresa está marcada para eliminación
   */
  async login(email: string, password: string): Promise<LoginResult> {
    // 1. Normalizar email a minúsculas
    const normalizedEmail = email.toLowerCase();

    // 2. Buscar usuario por email
    const user = await this.deps.userRepository.findByEmail(normalizedEmail);

    // 3. Verificar contraseña (timing attack prevention)
    if (!user) {
      // Usuario no encontrado: verificar contra DUMMY_HASH para igualar timing
      await this.deps.passwordService.verify(password, DUMMY_HASH);
      throw new InvalidCredentialsError();
    }

    const passwordValid = await this.deps.passwordService.verify(
      password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new InvalidCredentialsError();
    }

    // 4. Verificar estado de la empresa
    const company = await this.deps.companyRepository.findById(user.companyId);

    if (company?.status === CompanyStatus.PENDING_DELETION) {
      throw new CompanyPendingDeletionError(company.deletionReqDate ?? new Date());
    }

    // 5. Revocar todos los refresh tokens existentes del usuario
    await this.deps.refreshTokenRepository.revokeAllByUserId(user.id);

    // 6. Generar nuevo refresh token
    const refreshTokenValue = this.deps.tokenService.generateRefreshToken();

    // 7. Crear registro de refresh token en BD
    const now = new Date();
    await this.deps.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      revoked: false,
      createdAt: now,
    });

    // 8. Actualizar activeSessionId del usuario
    const sessionId = refreshTokenValue.substring(0, 32);
    await this.deps.userRepository.update(user.id, {
      activeSessionId: sessionId,
    });

    // 9. Generar access token
    const accessTokenPayload: AccessTokenPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      emailVerified: user.emailVerified,
      companyName: company?.name,
    };
    const accessToken = this.deps.tokenService.generateAccessToken(accessTokenPayload);

    // 10. Retornar resultado
    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        userId: user.id,
        email: user.email,
        companyId: user.companyId,
        emailVerified: user.emailVerified,
      },
    };
  }
}
