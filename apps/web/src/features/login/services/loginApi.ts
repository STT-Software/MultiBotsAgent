export interface LoginResponse {
  accessToken: string;
  user: {
    userId: string;
    email: string;
    companyId: string;
    emailVerified: boolean;
  };
}

export interface LoginApiError {
  status: number;
  code: string;
  message: string;
  deletionDate?: string;
  retryAfter?: number;
}

/**
 * Autentica al usuario con email y contraseña.
 * @returns LoginResponse en caso de éxito (200)
 * @throws LoginApiError con detalles del error
 */
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  if (res.status === 200) {
    return res.json();
  }

  const errorData = await res.json().catch(() => ({}));
  const error: LoginApiError = {
    status: res.status,
    code: errorData.error?.code || 'INVALID_CREDENTIALS',
    message: errorData.error?.message || 'Email o contraseña incorrectos',
  };

  if (res.status === 429) {
    error.retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10);
  }

  if (res.status === 403 && errorData.error?.code === 'COMPANY_PENDING_DELETION') {
    error.deletionDate = errorData.error.deletionDate;
  }

  throw error;
}
