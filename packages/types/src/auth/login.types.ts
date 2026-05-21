/**
 * Tipos del dominio de autenticación (login, refresh, logout).
 * Define DTOs e interfaces de respuesta para los endpoints de autenticación.
 */

// ─── DTOs ────────────────────────────────────────────────────────────────────

/** DTO de entrada para el endpoint POST /auth/login. */
export interface LoginDto {
  /** Email del usuario (se normaliza a minúsculas). */
  email: string;
  /** Contraseña en texto plano. */
  password: string;
}

// ─── Respuestas ──────────────────────────────────────────────────────────────

/** Respuesta exitosa del endpoint POST /auth/login. */
export interface LoginResponse {
  /** JWT de acceso (HS256, expiración 30 min). */
  accessToken: string;
  /** Datos básicos del usuario autenticado. */
  user: {
    userId: string;
    email: string;
    companyId: string;
    emailVerified: boolean;
  };
}

/** Respuesta exitosa del endpoint POST /auth/refresh. */
export interface RefreshResponse {
  /** Nuevo JWT de acceso (HS256, expiración 30 min). */
  accessToken: string;
}

// ─── Resultado interno del LoginService ──────────────────────────────────────

/** Resultado interno del LoginService (incluye refresh token para setear cookie). */
export interface LoginResult {
  /** JWT de acceso. */
  accessToken: string;
  /** Refresh token opaco (128 caracteres hex). Se entrega como httpOnly cookie. */
  refreshToken: string;
  /** Datos básicos del usuario autenticado. */
  user: {
    userId: string;
    email: string;
    companyId: string;
    emailVerified: boolean;
  };
}
