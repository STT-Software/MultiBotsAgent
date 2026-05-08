/**
 * Utilidades de autenticación para el frontend.
 *
 * - AuthStore: almacenamiento de access token en memoria (NUNCA localStorage/sessionStorage)
 * - fetchWithAuth: wrapper de fetch con Authorization header y refresh transparente
 * - refreshAccessToken: renueva el access token usando la cookie httpOnly
 * - logout: cierra sesión y redirige a /login
 *
 * El refresh token se gestiona exclusivamente como cookie httpOnly por el navegador.
 * Nunca aparece en código JavaScript ni en estado de la aplicación.
 */

// ─── AuthStore ───────────────────────────────────────────────────────────────

/**
 * Almacenamiento de access token en memoria.
 * NUNCA se almacena en localStorage/sessionStorage para prevenir XSS.
 * El token se pierde al recargar la página (se renueva via refresh token cookie).
 */
export class AuthStore {
  private static accessToken: string | null = null;

  static setToken(token: string): void {
    AuthStore.accessToken = token;
  }

  static getToken(): string | null {
    return AuthStore.accessToken;
  }

  static clearToken(): void {
    AuthStore.accessToken = null;
  }
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

/**
 * Intenta renovar el access token usando el refresh token (cookie httpOnly).
 * Retorna true si la renovación fue exitosa, false si debe redirigir a login.
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Envía cookie httpOnly automáticamente
    });

    if (res.status === 200) {
      const data = await res.json();
      AuthStore.setToken(data.accessToken);
      return true;
    }

    // Token expirado o sesión reemplazada → limpiar y redirigir
    AuthStore.clearToken();
    return false;
  } catch {
    AuthStore.clearToken();
    return false;
  }
}

// ─── fetchWithAuth ───────────────────────────────────────────────────────────

/**
 * Wrapper de fetch que agrega Authorization header y maneja 401 transparentemente.
 * Si recibe 401, intenta refresh una vez. Si falla, redirige a /login.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = AuthStore.getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(url, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = AuthStore.getToken();
      if (newToken) headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers, credentials: 'include' });
    } else {
      // Refresh falló → redirigir a login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  return res;
}

// ─── Logout ──────────────────────────────────────────────────────────────────

/**
 * Cierra sesión: revoca refresh token en servidor, limpia token en memoria, redirige.
 */
export async function logout(): Promise<void> {
  try {
    await fetchWithAuth('/auth/logout', { method: 'POST' });
  } finally {
    AuthStore.clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}
