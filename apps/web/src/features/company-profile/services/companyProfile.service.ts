import { fetchWithAuth } from '@/lib/auth';
import type {
  CompanyProfileResponse,
  UpdateCompanyProfileDto,
  LogoUploadUrlRequest,
  LogoUploadUrlResponse,
} from '@multibotagents/types';

// ─── Error Types ─────────────────────────────────────────────────────────────

export interface ServiceError {
  status: number;
  message: string;
  fields?: Record<string, string>;
}

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Obtiene el perfil de la empresa del usuario autenticado.
 * GET /company-profile con Bearer token.
 */
export async function getProfile(): Promise<CompanyProfileResponse> {
  const res = await fetchWithAuth('/company-profile', { method: 'GET' });

  if (res.ok) {
    return res.json();
  }

  throw await buildServiceError(res);
}

/**
 * Actualiza parcialmente el perfil de la empresa.
 * PATCH /company-profile con Bearer token.
 */
export async function updateProfile(
  data: UpdateCompanyProfileDto,
): Promise<CompanyProfileResponse> {
  const res = await fetchWithAuth('/company-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (res.ok) {
    return res.json();
  }

  throw await buildServiceError(res);
}

/**
 * Solicita una presigned URL para subir el logo a S3.
 * POST /company-profile/logo/upload-url con Bearer token.
 */
export async function getLogoUploadUrl(
  contentType: LogoUploadUrlRequest['contentType'],
  fileName: string,
): Promise<LogoUploadUrlResponse> {
  const body: LogoUploadUrlRequest = { contentType, fileName };

  const res = await fetchWithAuth('/company-profile/logo/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    return res.json();
  }

  throw await buildServiceError(res);
}

/**
 * Sube el archivo directamente a S3 usando la presigned URL.
 * PUT directo a S3 con Content-Type del archivo.
 */
export async function uploadLogoToS3(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!res.ok) {
    throw {
      status: res.status,
      message: 'Error al subir el archivo. Intenta nuevamente.',
    } satisfies ServiceError;
  }
}

/**
 * Elimina el logo de la empresa.
 * DELETE /company-profile/logo con Bearer token.
 */
export async function deleteLogo(): Promise<void> {
  const res = await fetchWithAuth('/company-profile/logo', {
    method: 'DELETE',
  });

  if (res.ok) {
    return;
  }

  throw await buildServiceError(res);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function buildServiceError(res: Response): Promise<ServiceError> {
  const data = await res.json().catch(() => ({}));

  const error: ServiceError = {
    status: res.status,
    message: '',
  };

  if (res.status === 400) {
    if (data.fields && typeof data.fields === 'object') {
      error.fields = data.fields;
      error.message = data.message || 'Los datos enviados son inválidos.';
    } else {
      error.message = data.message || 'Los datos enviados son inválidos. Revisa el formulario.';
    }
  } else if (res.status === 404) {
    error.message = 'No se encontró el perfil de la empresa.';
  } else {
    error.message = 'Ocurrió un error inesperado. Por favor intenta más tarde.';
  }

  return error;
}
