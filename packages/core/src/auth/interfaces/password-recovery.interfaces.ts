/**
 * Interfaces y tipos del servicio de restablecimiento de contraseña (Reset Password).
 *
 * Define las dependencias del servicio ResetPasswordService y la entidad
 * de token de verificación utilizada en el flujo de recuperación de contraseña.
 */

// ─── Token Entity ────────────────────────────────────────────────────────────

/** Documento de token de verificación retornado por el repositorio. */
export interface VerifyTokenDocument {
  id: string;
  userId: string;
  type: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// ─── Repository Interfaces ───────────────────────────────────────────────────

/** Interfaz del repositorio de usuario para el servicio de reset de contraseña. */
export interface IResetPasswordUserRepository {
  /** Busca un usuario por ID. Retorna null si no existe. */
  findById(userId: string): Promise<{ id: string; passwordHash: string } | null>;
  /** Actualiza el hash de contraseña de un usuario de forma atómica. */
  updatePasswordHash(userId: string, newHash: string): Promise<boolean>;
}

/** Interfaz del repositorio de tokens de verificación para el servicio de reset de contraseña. */
export interface IResetPasswordTokenRepository {
  /** Busca un token por valor y tipo. Retorna null si no existe. */
  findByTokenAndType(token: string, type: string): Promise<VerifyTokenDocument | null>;
  /** Marca un token como usado (setea usedAt a la fecha actual). */
  markAsUsed(tokenId: string): Promise<void>;
}

// ─── Service Dependencies ────────────────────────────────────────────────────

/** Dependencias inyectables del servicio de reset de contraseña. */
export interface ResetPasswordDeps {
  userRepository: IResetPasswordUserRepository;
  verifyTokenRepository: IResetPasswordTokenRepository;
}
