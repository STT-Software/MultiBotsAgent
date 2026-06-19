/**
 * Tipos del dominio de gestión del perfil de empresa.
 * Define DTOs e interfaces para los flujos de visualización, edición y carga de logo.
 */

import { CompanySize, ReferralSource, ServiceCategory } from '../auth/register.types';

// ─── DTOs ────────────────────────────────────────────────────────────────────

/** DTO para actualizar el perfil de empresa. Todos los campos son opcionales (PATCH parcial). */
export interface UpdateCompanyProfileDto {
  /** Nombre de la empresa. */
  name?: string;
  /** Código de país ISO 3166-1 alpha-2. */
  country?: string;
  /** Categoría de servicios de la empresa. */
  category?: ServiceCategory;
  /** Tamaño de la empresa. */
  size?: CompanySize;
  /** Teléfono con código de país (null para eliminar). */
  phone?: string | null;
  /** URL del logo en S3 (null para eliminar). */
  logo?: string | null;
  /** Fuente de referencia (null para eliminar). */
  referralSource?: ReferralSource | null;
  /** Timeout de auto-devolución de escalamiento en minutos. */
  escalationTimeoutMinutes?: number;
}

/** Respuesta del perfil de empresa (incluye email del usuario como solo lectura). */
export interface CompanyProfileResponse {
  /** Identificador único de la empresa. */
  id: string;
  /** Nombre de la empresa. */
  name: string;
  /** Código de país ISO 3166-1 alpha-2. */
  country: string;
  /** Categoría de servicios. */
  category: ServiceCategory;
  /** Tamaño de la empresa. */
  size: CompanySize;
  /** Teléfono con código de país. */
  phone: string | null;
  /** URL del logo en S3. */
  logo: string | null;
  /** Fuente de referencia. */
  referralSource: ReferralSource | null;
  /** Timeout de auto-devolución de escalamiento en minutos. */
  escalationTimeoutMinutes?: number;
  /** Email del usuario (solo lectura, no editable). */
  email: string;
}

// ─── Logo Upload ─────────────────────────────────────────────────────────────

/** Request para generar presigned URL de carga de logo. */
export interface LogoUploadUrlRequest {
  /** Tipo de contenido del archivo (solo PNG o JPEG). */
  contentType: 'image/png' | 'image/jpeg';
  /** Nombre del archivo original. */
  fileName: string;
}

/** Respuesta con las URLs para carga de logo. */
export interface LogoUploadUrlResponse {
  /** Presigned URL para subir el archivo directamente a S3 (PUT). */
  uploadUrl: string;
  /** URL pública del logo una vez subido. */
  logoUrl: string;
}
