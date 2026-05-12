/**
 * Validador de datos de registro de empresa y usuario.
 *
 * Responsabilidades:
 * - Validar campos obligatorios y opcionales del RegisterDto
 * - Sanitizar campos de texto (strip HTML, caracteres de control)
 * - Validar formatos (email, contraseña, teléfono)
 * - Validar pertenencia a catálogos (enums, países)
 * - Lanzar ValidationError con detalle de campos inválidos
 *
 * Este módulo es lógica pura sin dependencias de AWS ni I/O.
 */
import type { RegisterDto } from '@multibotagents/types';
import {
  CompanySize,
  ReferralSource,
  ServiceCategory,
  ValidationError,
} from '@multibotagents/types';

// ─── Validated Output ────────────────────────────────────────────────────────

/** Datos de registro validados y sanitizados, listos para procesamiento. */
export interface ValidatedRegisterData {
  companyName: string;
  email: string;
  password: string;
  country: string;
  category: ServiceCategory;
  size: CompanySize;
  phone?: string;
  phoneCountryCode?: string;
  referralSource?: ReferralSource;
  captchaToken?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Regex para validación de formato de email (RFC 5322 simplificado). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Regex para validación de contraseña:
 * - Mínimo 8 caracteres
 * - Al menos 1 letra mayúscula
 * - Al menos 1 número
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_NUMBER_REGEX = /\d/;

/** Regex para strip de tags HTML. */
const HTML_TAGS_REGEX = /<[^>]*>/g;

/** Regex para strip de caracteres de control. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/g;

/** Regex para validación básica de teléfono (dígitos, espacios, guiones, paréntesis, +). */
const PHONE_REGEX = /^\+?[\d\s\-()]{6,20}$/;

/** Longitud máxima del nombre de empresa. */
const COMPANY_NAME_MAX_LENGTH = 100;

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

// ─── Sanitization Helpers ────────────────────────────────────────────────────

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

// ─── Validator ───────────────────────────────────────────────────────────────

/**
 * Valida y sanitiza los datos de registro.
 *
 * @param dto - Datos de entrada del formulario de registro
 * @returns Datos validados y sanitizados listos para procesamiento
 * @throws {ValidationError} Si algún campo es inválido, con detalle de campos
 *
 * @example
 * ```typescript
 * const validated = validateRegister(dto);
 * // Si llega aquí, los datos son válidos y sanitizados
 * ```
 */
export function validateRegister(dto: RegisterDto): ValidatedRegisterData {
  const errors: Record<string, string> = {};

  // ── companyName ──
  if (!dto.companyName || dto.companyName.trim().length === 0) {
    errors.companyName = 'El nombre de empresa es obligatorio';
  } else if (sanitizeText(dto.companyName).length === 0) {
    errors.companyName = 'El nombre de empresa es obligatorio';
  } else if (sanitizeText(dto.companyName).length > COMPANY_NAME_MAX_LENGTH) {
    errors.companyName = `El nombre de empresa no puede exceder ${COMPANY_NAME_MAX_LENGTH} caracteres`;
  }

  // ── email ──
  if (!dto.email || dto.email.trim().length === 0) {
    errors.email = 'El email es obligatorio';
  } else if (!EMAIL_REGEX.test(dto.email.trim())) {
    errors.email = 'Formato de email inválido';
  }

  // ── password ──
  if (!dto.password) {
    errors.password = 'La contraseña es obligatoria';
  } else if (dto.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  } else if (!PASSWORD_UPPERCASE_REGEX.test(dto.password)) {
    errors.password = 'La contraseña debe contener al menos una letra mayúscula';
  } else if (!PASSWORD_NUMBER_REGEX.test(dto.password)) {
    errors.password = 'La contraseña debe contener al menos un número';
  }

  // ── country ──
  if (!dto.country || dto.country.trim().length === 0) {
    errors.country = 'El país es obligatorio';
  } else if (!ISO_3166_ALPHA2_CODES.has(dto.country.trim().toUpperCase())) {
    errors.country = 'Código de país inválido';
  }

  // ── category ──
  if (!dto.category) {
    errors.category = 'La categoría de servicios es obligatoria';
  } else if (!Object.values(ServiceCategory).includes(dto.category)) {
    errors.category = 'Categoría de servicios no válida';
  }

  // ── size ──
  if (!dto.size) {
    errors.size = 'El tamaño de empresa es obligatorio';
  } else if (!Object.values(CompanySize).includes(dto.size)) {
    errors.size = 'Tamaño de empresa no válido';
  }

  // ── phone (opcional) ──
  if (dto.phone !== undefined && dto.phone !== null && dto.phone.trim().length > 0) {
    const sanitizedPhone = sanitizeText(dto.phone);
    if (!PHONE_REGEX.test(sanitizedPhone)) {
      errors.phone = 'Formato de teléfono inválido';
    }
  }

  // ── referralSource (opcional) ──
  if (dto.referralSource !== undefined && dto.referralSource !== null) {
    if (!Object.values(ReferralSource).includes(dto.referralSource)) {
      errors.referralSource = 'Fuente de referencia no válida';
    }
  }

  // ── Throw si hay errores ──
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  // ── Construir datos validados y sanitizados ──
  const validated: ValidatedRegisterData = {
    companyName: sanitizeText(dto.companyName),
    email: dto.email.trim().toLowerCase(),
    password: dto.password,
    country: dto.country.trim().toUpperCase(),
    category: dto.category,
    size: dto.size,
  };

  // Campos opcionales
  if (dto.phone && dto.phone.trim().length > 0) {
    validated.phone = sanitizeText(dto.phone);
  }

  if (dto.phoneCountryCode && dto.phoneCountryCode.trim().length > 0) {
    validated.phoneCountryCode = sanitizeText(dto.phoneCountryCode);
  }

  if (dto.referralSource) {
    validated.referralSource = dto.referralSource;
  }

  if (dto.captchaToken) {
    validated.captchaToken = dto.captchaToken;
  }

  return validated;
}
