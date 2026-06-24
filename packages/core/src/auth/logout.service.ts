/**
 * Servicio de cierre de sesión (logout).
 *
 * Revoca todos los refresh tokens activos del usuario.
 *
 * Este módulo es lógica pura sin dependencias de AWS ni MongoDB.
 */

// ─── Repository Interfaces ───────────────────────────────────────────────────

/** Interfaz simplificada del repositorio de refresh tokens para LogoutService. */
export interface ILogoutRefreshTokenRepository {
  revokeAllByUserId(userId: string): Promise<void>;
}

// ─── Service Dependencies ────────────────────────────────────────────────────

export interface LogoutServiceDeps {
  refreshTokenRepository: ILogoutRefreshTokenRepository;
}

// ─── LogoutService ───────────────────────────────────────────────────────────

export class LogoutService {
  private readonly deps: LogoutServiceDeps;

  constructor(deps: LogoutServiceDeps) {
    this.deps = deps;
  }

  /**
   * Cierra la sesión del usuario revocando todos sus refresh tokens activos.
   *
   * @param userId - ID del usuario que cierra sesión
   */
  async logout(userId: string): Promise<void> {
    await this.deps.refreshTokenRepository.revokeAllByUserId(userId);
  }
}
