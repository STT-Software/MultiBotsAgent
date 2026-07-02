/**
 * Validador de datos del perfil de empresa.
 *
 * Responsabilidades:
 * - Validar campos del UpdateCompanyProfileDto
 * - Sanitizar campos de texto (trim, strip HTML/scripts)
 * - Validar formatos (teléfono, país, enums)
 * - Validar contentType para logo
 * - Lanzar InvalidProfileDataError con detalle de campos inválidos
 *
 * Este módulo es lógica pura sin dependencias de AWS ni I/O.
 */
import type { UpdateCompanyProfileDto } from '@multibotagents/types';
import {
  CompanySize,
  ReferralSource,
  ServiceCategory,
} from '@multibotagents/types';
import { InvalidProfileDataError, InvalidContentTypeError } from './errors';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Regex para strip de tags HTML. */
const HTML_TAGS_REGEX = /<[^>]*>/g;

/** Regex para strip de caracteres de control. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/g;

/** Regex para validación básica de teléfono con código de país (dígitos, espacios, guiones, paréntesis, +). */
const PHONE_REGEX = /^\+?[\d\s\-()]{6,20}$/;

/** Longitud máxima del nombre de empresa. */
const COMPANY_NAME_MAX_LENGTH = 100;

/** Content types permitidos para logo. */
const ALLOWED_LOGO_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
]);

/**
 * Códigos de país ISO 3166-1 alpha-2.
 * Lista completa de países reconocidos internacionalmente.
 */
export const ISO_3166_ALPHA2_CODES: ReadonlySet<string> = new Set([
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR',
  'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE',
  'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ',
  'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD',
  'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR',
  'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI',
  'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS',
  'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
  'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK',
  'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME',
  'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ',
  'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU',
  'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS',
  'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI',
  'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV',
  'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK',
  'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA',
  'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
]);

// ─── Sanitization ────────────────────────────────────────────────────────────

/**
 * Sanitiza un campo de texto eliminando HTML tags, caracteres de control y whitespace extra.
 * @param value - Valor a sanitizar
 * @returns Valor sanitizado
 */
export function sanitizeText(value: string): string {
  return value
    .replace(HTML_TAGS_REGEX, '')
    .replace(CONTROL_CHARS_REGEX, '')
    .trim();
}

// ─── Validated Result Type ───────────────────────────────────────────────────

/** Datos validados y sanitizados del perfil de empresa. */
export interface ValidatedProfileData {
  name?: string;
  country?: string;
  category?: ServiceCategory;
  size?: CompanySize;
  phone?: string | null;
  logo?: string | null;
  referralSource?: ReferralSource | null;
  escalationTimeoutMinutes?: number;
}

// ─── Validator ───────────────────────────────────────────────────────────────

/**
 * Valida y sanitiza los datos de actualización del perfil de empresa.
 * Solo valida los campos que están presentes en el DTO (PATCH parcial).
 *
 * @param dto - Datos de entrada del formulario de edición
 * @returns Datos validados y sanitizados
 * @throws {InvalidProfileDataError} Si algún campo es inválido, con detalle de campos
 */
export function validateProfileUpdate(dto: UpdateCompanyProfileDto): ValidatedProfileData {
  const errors: Record<string, string> = {};
  const validated: ValidatedProfileData = {};

  // ── name ──
  if (dto.name !== undefined) {
    if (!dto.name || dto.name.trim().length === 0) {
      errors.name = 'El nombre de empresa es obligatorio';
    } else {
      const sanitizedName = sanitizeText(dto.name);
      if (sanitizedName.length === 0) {
        errors.name = 'El nombre de empresa es obligatorio';
      } else if (sanitizedName.length > COMPANY_NAME_MAX_LENGTH) {
        errors.name = `El nombre no puede exceder ${COMPANY_NAME_MAX_LENGTH} caracteres`;
      } else {
        validated.name = sanitizedName;
      }
    }
  }

  // ── country ──
  if (dto.country !== undefined) {
    if (!dto.country || dto.country.trim().length === 0) {
      errors.country = 'El país es obligatorio';
    } else {
      const normalizedCountry = dto.country.trim().toUpperCase();
      if (!ISO_3166_ALPHA2_CODES.has(normalizedCountry)) {
        errors.country = 'Código de país inválido';
      } else {
        validated.country = normalizedCountry;
      }
    }
  }

  // ── category ──
  if (dto.category !== undefined) {
    if (!dto.category) {
      errors.category = 'La categoría de servicios es obligatoria';
    } else if (!Object.values(ServiceCategory).includes(dto.category)) {
      errors.category = 'Categoría de servicios no válida';
    } else {
      validated.category = dto.category;
    }
  }

  // ── size ──
  if (dto.size !== undefined) {
    if (!dto.size) {
      errors.size = 'El tamaño de empresa es obligatorio';
    } else if (!Object.values(CompanySize).includes(dto.size)) {
      errors.size = 'Tamaño de empresa no válido';
    } else {
      validated.size = dto.size;
    }
  }

  // ── phone (opcional, null permitido) ──
  if (dto.phone !== undefined) {
    if (dto.phone === null) {
      validated.phone = null;
    } else if (dto.phone.trim().length === 0) {
      validated.phone = null;
    } else {
      const sanitizedPhone = sanitizeText(dto.phone);
      if (!PHONE_REGEX.test(sanitizedPhone)) {
        errors.phone = 'Formato de teléfono inválido';
      } else {
        validated.phone = sanitizedPhone;
      }
    }
  }

  // ── referralSource (opcional, null permitido) ──
  if (dto.referralSource !== undefined) {
    if (dto.referralSource === null) {
      validated.referralSource = null;
    } else if (!Object.values(ReferralSource).includes(dto.referralSource)) {
      errors.referralSource = 'Fuente de referencia no válida';
    } else {
      validated.referralSource = dto.referralSource;
    }
  }

  // ── logo (pass-through, validated elsewhere) ──
  if (dto.logo !== undefined) {
    validated.logo = dto.logo;
  }

  // ── escalationTimeoutMinutes ──
  if (dto.escalationTimeoutMinutes !== undefined) {
    const minutes = dto.escalationTimeoutMinutes;
    if (minutes === null || minutes === undefined || typeof minutes !== 'number' || Number.isNaN(minutes)) {
      errors.escalationTimeoutMinutes = 'El timeout de escalamiento debe ser un número';
    } else if (!Number.isInteger(minutes)) {
      errors.escalationTimeoutMinutes = 'El timeout de escalamiento debe ser un número entero';
    } else if (minutes < 5 || minutes > 1440) {
      errors.escalationTimeoutMinutes = 'El timeout de escalamiento debe estar entre 5 y 1440 minutos';
    } else {
      validated.escalationTimeoutMinutes = minutes;
    }
  }

  // ── Throw si hay errores ──
  if (Object.keys(errors).length > 0) {
    throw new InvalidProfileDataError(errors);
  }

  return validated;
}

/**
 * Valida que el content type del logo sea permitido.
 *
 * @param contentType - MIME type del archivo
 * @throws {InvalidContentTypeError} Si el content type no es image/png o image/jpeg
 */
export function validateLogoContentType(contentType: string): void {
  if (!ALLOWED_LOGO_CONTENT_TYPES.has(contentType)) {
    throw new InvalidContentTypeError(contentType);
  }
}
