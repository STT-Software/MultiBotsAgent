/**
 * Errores del dominio de Integraciones Externas (SL13).
 *
 * Errores tipados con `code` + `statusCode` para mapeo HTTP en los handlers,
 * siguiendo el patrón de `company-profile/errors.ts`.
 */

// ─── Error Codes ─────────────────────────────────────────────────────────────

/** Códigos de error del dominio de integraciones. */
export enum IntegrationErrorCode {
  INVALID_OAUTH_STATE = "INVALID_OAUTH_STATE",
}

// ─── Base Error ──────────────────────────────────────────────────────────────

/** Error base del dominio de integraciones. */
export class IntegrationError extends Error {
  /** Código de error para identificación programática. */
  readonly code: IntegrationErrorCode;
  /** HTTP status code sugerido para el handler. */
  readonly statusCode: number;

  constructor(message: string, code: IntegrationErrorCode, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Domain Errors ───────────────────────────────────────────────────────────

/**
 * El `state` recibido en el callback es inválido, expiró o ya fue usado.
 *
 * Cubre R1.6: firma incorrecta, TTL vencido o reuso del `code`. El flujo se
 * rechaza sin almacenar nada y el panel muestra "El proceso expiró, intenta de nuevo".
 */
export class InvalidOAuthStateError extends IntegrationError {
  constructor() {
    super(
      "El proceso de conexión expiró o no es válido. Intenta de nuevo.",
      IntegrationErrorCode.INVALID_OAUTH_STATE,
      400,
    );
  }
}
