/**
 * Errores específicos del dominio de gestión del perfil de empresa.
 * Define errores tipados para cada caso de fallo del flujo de perfil.
 */

// ─── Error Codes ─────────────────────────────────────────────────────────────

/** Códigos de error del dominio de perfil de empresa. */
export enum CompanyProfileErrorCode {
  COMPANY_NOT_FOUND = 'COMPANY_NOT_FOUND',
  INVALID_PROFILE_DATA = 'INVALID_PROFILE_DATA',
  LOGO_UPLOAD_ERROR = 'LOGO_UPLOAD_ERROR',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
}

// ─── Base Error ──────────────────────────────────────────────────────────────

/**
 * Error base del dominio de perfil de empresa.
 */
export class CompanyProfileError extends Error {
  /** Código de error para identificación programática. */
  readonly code: CompanyProfileErrorCode;
  /** HTTP status code sugerido para el handler. */
  readonly statusCode: number;

  constructor(message: string, code: CompanyProfileErrorCode, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Domain Errors ───────────────────────────────────────────────────────────

/**
 * Error cuando la empresa no se encuentra en la base de datos.
 */
export class CompanyNotFoundError extends CompanyProfileError {
  readonly companyId: string;

  constructor(companyId: string) {
    super(
      `Empresa no encontrada: ${companyId}`,
      CompanyProfileErrorCode.COMPANY_NOT_FOUND,
      404,
    );
    this.companyId = companyId;
  }
}

/**
 * Error de validación de datos del perfil de empresa.
 * Contiene detalle de campos específicos que fallaron la validación.
 */
export class InvalidProfileDataError extends CompanyProfileError {
  /** Mapa de campo → mensaje de error para cada campo inválido. */
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    super(
      'Datos del perfil inválidos',
      CompanyProfileErrorCode.INVALID_PROFILE_DATA,
      400,
    );
    this.fields = fields;
  }
}

/**
 * Error al subir o procesar el logo de la empresa.
 */
export class LogoUploadError extends CompanyProfileError {
  readonly detail: string;

  constructor(detail: string) {
    super(
      `Error al procesar el logo: ${detail}`,
      CompanyProfileErrorCode.LOGO_UPLOAD_ERROR,
      500,
    );
    this.detail = detail;
  }
}

/**
 * Error cuando el content type del logo no es válido.
 * Solo se aceptan image/png e image/jpeg.
 */
export class InvalidContentTypeError extends CompanyProfileError {
  readonly contentType: string;

  constructor(contentType: string) {
    super(
      `Tipo de contenido no permitido: ${contentType}. Solo se aceptan image/png e image/jpeg.`,
      CompanyProfileErrorCode.INVALID_CONTENT_TYPE,
      400,
    );
    this.contentType = contentType;
  }
}
