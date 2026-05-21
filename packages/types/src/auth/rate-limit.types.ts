/**
 * Tipos del dominio de rate limiting para autenticación.
 * Define configuración, registros y la interfaz del repositorio.
 */

// ─── Configuración ───────────────────────────────────────────────────────────

/** Configuración del servicio de rate limiting. */
export interface RateLimitConfig {
  /** Máximo de intentos fallidos por IP antes de bloqueo. Default: 5. */
  ipMaxAttempts: number;
  /** Ventana de tiempo para conteo de intentos por IP (ms). Default: 60_000 (1 min). */
  ipWindowMs: number;
  /** Duración del bloqueo por IP (ms). Default: 300_000 (5 min). */
  ipBlockDurationMs: number;
  /** Máximo de intentos fallidos por email antes de bloqueo. Default: 10. */
  emailMaxAttempts: number;
  /** Ventana de tiempo para conteo de intentos por email (ms). Default: 600_000 (10 min). */
  emailWindowMs: number;
  /** Duración del bloqueo por email (ms). Default: 900_000 (15 min). */
  emailBlockDurationMs: number;
}

// ─── Registro de Rate Limit ──────────────────────────────────────────────────

/** Registro de rate limit almacenado en la colección `rateLimits`. */
export interface RateLimitRecord {
  /** Identificador único. */
  id: string;
  /** Clave del registro: "ip:<dirección_ip>" o "email:<dirección_email>". */
  key: string;
  /** Contador de intentos fallidos. */
  attempts: number;
  /** Fecha hasta la cual está bloqueado (null si no bloqueado). */
  blockedUntil: Date | null;
  /** Fecha de expiración para TTL index (auto-limpieza). */
  expiresAt: Date;
  /** Timestamp de creación. */
  createdAt: Date;
}

// ─── Interfaz del Repositorio ────────────────────────────────────────────────

/** Interfaz del repositorio de rate limiting. */
export interface IRateLimitRepository {
  /**
   * Busca un registro de rate limit por clave.
   * @param key - Clave del registro ("ip:<ip>" o "email:<email>")
   * @returns El registro encontrado o null si no existe
   */
  findByKey(key: string): Promise<RateLimitRecord | null>;

  /**
   * Incrementa el contador de intentos para una clave.
   * Si no existe, crea el registro. Si alcanza el umbral, establece blockedUntil.
   * @param key - Clave del registro
   * @param windowMs - Ventana de tiempo para el TTL del registro
   * @param blockDurationMs - Duración del bloqueo si se alcanza el umbral
   * @param maxAttempts - Número máximo de intentos antes de bloquear
   * @returns El registro actualizado
   */
  upsertAttempt(
    key: string,
    windowMs: number,
    blockDurationMs: number,
    maxAttempts: number,
  ): Promise<RateLimitRecord>;

  /**
   * Elimina/resetea el registro de rate limit para una clave.
   * @param key - Clave del registro a resetear
   */
  resetByKey(key: string): Promise<void>;
}
