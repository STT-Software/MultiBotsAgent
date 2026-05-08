export interface RegisterPayload {
  companyName: string;
  email: string;
  password: string;
  country: string;
  category: string;
  size: string;
  phone?: string;
  phoneCountryCode?: string;
  referralSource?: string;
}

export interface RegisterResponse {
  accessToken: string;
  user: Record<string, unknown>;
  company: Record<string, unknown>;
}

export interface RegisterError {
  status: number;
  message?: string;
  fields?: Record<string, string>;
}

/**
 * Registra una nueva empresa y usuario.
 * @returns RegisterResponse en caso de éxito (201)
 * @throws RegisterError con status y detalles del error
 */
export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  const res = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (res.status === 201) {
    return res.json();
  }

  const data = await res.json().catch(() => ({}));

  const error: RegisterError = { status: res.status };

  if (res.status === 400) {
    if (data.fields && typeof data.fields === 'object') {
      error.fields = data.fields;
    } else {
      error.message = data.message || 'Los datos enviados son inválidos. Revisa el formulario.';
    }
  } else if (res.status === 403) {
    error.message = 'El challenge de seguridad no fue superado. Intenta nuevamente.';
  } else if (res.status === 409) {
    error.message = 'Ya existe una cuenta con este email.';
  } else {
    error.message = 'Ocurrió un error inesperado. Por favor intenta más tarde.';
  }

  throw error;
}
