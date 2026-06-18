/**
 * Configuración OAuth 2.0 por proveedor (SL13).
 *
 * Centraliza los endpoints, scopes y origen de credenciales de cada proveedor
 * soportado. El callback es único (`/integrations/oauth/callback`) y el
 * proveedor se resuelve desde el `state`, por lo que aquí solo se describen las
 * piezas específicas de cada uno.
 *
 * Los `client_id`/`client_secret` NO se incrustan: se leen de variables de
 * entorno (SST Secrets) mediante `clientIdEnv`/`clientSecretEnv`.
 *
 * Decisión #5: Google Drive y Google Calendar comparten la misma app de Google
 * (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`); cada conexión pide solo los
 * scopes de su categoría.
 */
import {
  IntegrationProvider,
  IntegrationCategory,
} from "@multibotagents/types";

/** Descripción estática del flujo OAuth de un proveedor. */
export interface ProviderOAuthConfig {
  provider: IntegrationProvider;
  category: IntegrationCategory;
  /** Endpoint de autorización (donde se redirige al usuario). */
  authorizationUrl: string;
  /** Endpoint server-to-server para intercambiar `code` por tokens. */
  tokenUrl: string;
  /** Scopes solicitados para este proveedor. */
  scopes: string[];
  /** Nombre de la variable de entorno con el `client_id`. */
  clientIdEnv: string;
  /** Nombre de la variable de entorno con el `client_secret`. */
  clientSecretEnv: string;
  /**
   * Parámetros extra para la URL de autorización (p. ej. `access_type=offline`
   * y `prompt=consent` en Google, necesarios para recibir `refresh_token`).
   */
  authorizationParams?: Record<string, string>;
}

// ─── Registro por proveedor ──────────────────────────────────────────────────

/**
 * Configuración de cada proveedor. Los proveedores restantes (Notion,
 * Confluence, SharePoint, Dropbox, Google Calendar) se añaden en sus slices.
 */
const PROVIDER_OAUTH_CONFIG: Partial<
  Record<IntegrationProvider, ProviderOAuthConfig>
> = {
  [IntegrationProvider.GOOGLE_DRIVE]: {
    provider: IntegrationProvider.GOOGLE_DRIVE,
    category: IntegrationCategory.DOCUMENT_SOURCE,
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      // Lectura de archivos de Drive (SOL-06 solo lee contenido).
      "https://www.googleapis.com/auth/drive.readonly",
      // Identidad de la cuenta vinculada para `accountDisplayName`.
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    authorizationParams: {
      access_type: "offline",
      prompt: "consent",
    },
  },
};

// ─── Accesores ───────────────────────────────────────────────────────────────

/** Indica si un proveedor tiene configuración OAuth disponible. */
export function isProviderSupported(provider: IntegrationProvider): boolean {
  return provider in PROVIDER_OAUTH_CONFIG;
}

/**
 * Devuelve la configuración OAuth de un proveedor.
 * @throws Error si el proveedor aún no está soportado.
 */
export function getProviderOAuthConfig(
  provider: IntegrationProvider,
): ProviderOAuthConfig {
  const config = PROVIDER_OAUTH_CONFIG[provider];
  if (!config) {
    throw new Error(`Proveedor de integración no soportado: ${provider}`);
  }
  return config;
}

/** Credenciales del cliente OAuth resueltas desde el entorno. */
export interface ProviderClientCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Resuelve `client_id`/`client_secret` de un proveedor desde el entorno.
 * @throws Error si alguna variable de entorno no está configurada.
 */
export function resolveClientCredentials(
  config: ProviderOAuthConfig,
  env: NodeJS.ProcessEnv = process.env,
): ProviderClientCredentials {
  const clientId = env[config.clientIdEnv];
  const clientSecret = env[config.clientSecretEnv];

  if (!clientId || !clientSecret) {
    throw new Error(
      `Credenciales OAuth no configuradas para ${config.provider} ` +
        `(${config.clientIdEnv}/${config.clientSecretEnv}).`,
    );
  }

  return { clientId, clientSecret };
}
