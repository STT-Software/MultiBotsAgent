/**
 * Servicio de renovación de Access Token (refresh).
 *
 * Flujo: buscar refresh token en BD → verificar no revocado → verificar no expirado →
 *        verificar company active → generar nuevo access token
 *
 * Maneja:
 * - TokenExpiredError: token no existe o expiró naturalmente
 * - SessionReplacedError: token fue revocado (sesión reemplazada en otro dispositivo)
 * - CompanyInactiveError: empresa no está en estado 'active'
 *
 * Este módulo es lógica pura sin dependencias de AWS ni MongoDB.
 */
import type {
  AccessTokenPayload,
  RefreshToken,
  User,
  Company,
} from '@multibotagents/types';
import {
  TokenExpiredError,
  SessionReplacedError,
  CompanyInactiveError,
  CompanyStatus,
} from '@multibotagents/types';
import type { TokenService } from './token.service';

// ─── Repository Interfaces ───────────────────────────────────────────────────

/** Interfaz simplificada del repositorio de refresh tokens para RefreshService. */
export interface IRefreshTokenLookupRepository {
  findByToken(token: string): Promise<RefreshToken | null>;
}

/** Interfaz simplificada del repositorio de usuarios para RefreshService. */
export interface IRefreshUserRepository {
  findById(id: string): Promise<User | null>;
}

/** Interfaz simplificada del repositorio de empresas para RefreshService. */
export interface IRefreshCompanyRepository {
  findById(id: string): Promise<Company | null>;
}

// ─── Service Dependencies ────────────────────────────────────────────────────

export interface RefreshServiceDeps {
  refreshTokenRepository: IRefreshTokenLookupRepository;
  userRepository: IRefreshUserRepository;
  companyRepository: IRefreshCompanyRepository;
  tokenService: TokenService;
}

// ─── Result ──────────────────────────────────────────────────────────────────

export interface RefreshResult {
  accessToken: string;
}

// ─── RefreshService ──────────────────────────────────────────────────────────

export class RefreshService {
  private readonly deps: RefreshServiceDeps;

  constructor(deps: RefreshServiceDeps) {
    this.deps = deps;
  }

  /**
   * Renueva el access token usando un refresh token válido.
   *
   * @param refreshTokenValue - Valor del refresh token (leído de la cookie httpOnly)
   * @returns Nuevo access token
   * @throws {TokenExpiredError} Si el token no existe o expiró
   * @throws {SessionReplacedError} Si el token fue revocado (sesión reemplazada)
   * @throws {CompanyInactiveError} Si la empresa no está en estado 'active'
   */
  async refresh(refreshTokenValue: string): Promise<RefreshResult> {
    // 1. Buscar refresh token en BD
    const tokenRecord = await this.deps.refreshTokenRepository.findByToken(refreshTokenValue);

    if (!tokenRecord) {
      throw new TokenExpiredError();
    }

    // 2. Verificar si fue revocado (sesión reemplazada)
    if (tokenRecord.revoked) {
      throw new SessionReplacedError();
    }

    // 3. Verificar si expiró
    const now = new Date();
    if (tokenRecord.expiresAt < now) {
      throw new TokenExpiredError();
    }

    // 4. Buscar usuario
    const user = await this.deps.userRepository.findById(tokenRecord.userId);
    if (!user) {
      throw new TokenExpiredError();
    }

    // 5. Verificar estado de la empresa
    const company = await this.deps.companyRepository.findById(user.companyId);
    if (!company || company.status !== CompanyStatus.ACTIVE) {
      throw new CompanyInactiveError();
    }

    // 6. Generar nuevo access token con claims actualizados
    const payload: AccessTokenPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      emailVerified: user.emailVerified,
    };

    const accessToken = this.deps.tokenService.generateAccessToken(payload);

    return { accessToken };
  }
}
