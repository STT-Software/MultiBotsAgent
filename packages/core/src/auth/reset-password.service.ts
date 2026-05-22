/**
 * Servicio de restablecimiento de contraseña (Reset Password).
 *
 * Orquesta el flujo completo de reset de contraseña con token:
 * 1. Buscar token en verifyTokens por valor y type `password_reset`
 * 2. Validar que el token no sea inválido, ya usado, o expirado
 * 3. Validar nueva contraseña con las reglas de seguridad
 * 4. Hashear nueva contraseña (bcrypt, cost factor 12)
 * 5. Actualizar passwordHash del usuario
 * 6. Marcar token como usado
 *
 * Usa inyección de dependencias via constructor para facilitar testing.
 * Este módulo es lógica pura sin dependencias de AWS ni framework.
 */
import bcrypt from 'bcryptjs';

import type { PasswordValidationResult } from '@multibotagents/types';
import type {
  ResetPasswordDeps,
} from './interfaces/password-recovery.interfaces';
import { validatePassword } from './password.validator';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Cost factor para bcrypt. Equilibrio entre seguridad y rendimiento. */
const BCRYPT_COST_FACTOR = 12;

// ─── Domain Errors ───────────────────────────────────────────────────────────

/** Error: el token de reset no existe o es inválido. */
export class TokenInvalidError extends Error {
  readonly code = 'TOKEN_INVALID' as const;
  constructor() {
    super('El enlace es inválido');
    this.name = 'TokenInvalidError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Error: el token de reset ha expirado. */
export class TokenExpiredError extends Error {
  readonly code = 'TOKEN_EXPIRED' as const;
  constructor() {
    super('El enlace ha expirado. Solicita uno nuevo');
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Error: el token de reset ya fue utilizado. */
export class TokenAlreadyUsedError extends Error {
  readonly code = 'TOKEN_ALREADY_USED' as const;
  constructor() {
    super('El enlace ya fue utilizado');
    this.name = 'TokenAlreadyUsedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Error: la nueva contraseña no cumple los requisitos de seguridad. */
export class PasswordValidationError extends Error {
  readonly code = 'VALIDATION_FAILED' as const;
  readonly validationResult: PasswordValidationResult;

  constructor(validationResult: PasswordValidationResult) {
    super('La nueva contraseña no cumple los requisitos de seguridad');
    this.name = 'PasswordValidationError';
    this.validationResult = validationResult;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ResetPasswordService {
  private readonly deps: ResetPasswordDeps;

  constructor(deps: ResetPasswordDeps) {
    this.deps = deps;
  }

  /**
   * Valida el token de reset y actualiza la contraseña del usuario.
   *
   * @param token - Token de reset recibido por email
   * @param newPassword - Nueva contraseña deseada
   * @throws {TokenInvalidError} Si el token no existe o el usuario no se encuentra
   * @throws {TokenAlreadyUsedError} Si el token ya fue utilizado
   * @throws {TokenExpiredError} Si el token ha expirado
   * @throws {PasswordValidationError} Si la nueva contraseña no cumple requisitos
   */
  async execute(token: string, newPassword: string): Promise<void> {
    // 1. Buscar token en verifyTokens por valor y type `password_reset`
    const tokenDoc = await this.deps.verifyTokenRepository.findByTokenAndType(
      token,
      'password_reset',
    );

    // 2. Si no existe → lanzar TokenInvalidError
    if (!tokenDoc) {
      throw new TokenInvalidError();
    }

    // 3. Si usedAt !== null → lanzar TokenAlreadyUsedError
    if (tokenDoc.usedAt !== null) {
      throw new TokenAlreadyUsedError();
    }

    // 4. Si expiresAt < now → lanzar TokenExpiredError
    if (tokenDoc.expiresAt < new Date()) {
      throw new TokenExpiredError();
    }

    // 5. Validar nueva contraseña con validatePassword()
    const validationResult = validatePassword(newPassword);

    // 6. Si no cumple reglas → lanzar PasswordValidationError con failedRules
    if (!validationResult.isValid) {
      throw new PasswordValidationError(validationResult);
    }

    // 7. Buscar usuario por userId del token. Si no existe → lanzar TokenInvalidError
    const user = await this.deps.userRepository.findById(tokenDoc.userId);
    if (!user) {
      throw new TokenInvalidError();
    }

    // 8. Generar hash con bcrypt (cost factor 12)
    const salt = await bcrypt.genSalt(BCRYPT_COST_FACTOR);
    const newHash = await bcrypt.hash(newPassword, salt);

    // 9. Actualizar passwordHash del usuario
    const updated = await this.deps.userRepository.updatePasswordHash(tokenDoc.userId, newHash);
    if (!updated) {
      throw new Error('No se pudo actualizar la contraseña. Intenta más tarde.');
    }

    // 10. Marcar token como usado
    await this.deps.verifyTokenRepository.markAsUsed(tokenDoc.id);
  }
}
