import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
} from "@nestjs/common";
import { IntegrationProvider } from "@multibotagents/types";
import {
  getProviderOAuthConfig,
  resolveClientCredentials,
  type ProviderOAuthConfig,
} from "../oauth";

/**
 * Resultado del intercambio `code` → tokens de un proveedor OAuth.
 */
export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  /** Momento de expiración del access token (si el proveedor lo informa). */
  expiresAt?: Date;
  /** Scopes efectivamente concedidos por el proveedor. */
  scopes: string[];
}

/**
 * Metadata de la cuenta vinculada en el proveedor.
 */
export interface ProviderAccountMetadata {
  accountDisplayName?: string;
  providerAccountId?: string;
}

/** Forma de la respuesta del token endpoint de Google. */
interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

/** Forma de la respuesta de `oauth2/v2/userinfo` de Google. */
interface GoogleUserInfoResponse {
  id?: string;
  email?: string;
}

/** Endpoint de información del usuario de Google (cuenta vinculada). */
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/** Endpoint de revocación de tokens de Google (desconexión). */
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/**
 * Adaptador de Google Drive (SL13).
 *
 * Slice 1 (esqueleto): implementa la parte OAuth necesaria para conectar la
 * integración —intercambio `code` → tokens (R1.3) y lectura de la metadata de
 * la cuenta (R1.4)—. Los métodos del `DocumentSourceAdapter`
 * (`listItems`/`fetchContent`) se implementan en el Slice 3.
 */
@Injectable()
export class GoogleDriveAdapter {
  private readonly logger = new Logger(GoogleDriveAdapter.name);
  private readonly config: ProviderOAuthConfig;

  constructor() {
    this.config = getProviderOAuthConfig(IntegrationProvider.GOOGLE_DRIVE);
  }

  /**
   * Intercambia el `code` de autorización por `access_token` + `refresh_token`
   * mediante una llamada server-to-server al token endpoint de Google (R1.3).
   *
   * @throws BadRequestException si el `code` es inválido o el intercambio falla (R1.8).
   * @throws BadGatewayException si Google no está disponible.
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokenResult> {
    const { clientId, clientSecret } = resolveClientCredentials(this.config);

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await this.makeRequest(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await this.parseResponse<GoogleTokenResponse>(response);

    if (!data.access_token) {
      throw new BadRequestException(
        "El intercambio de código por tokens no devolvió un access_token. Intenta reconectar.",
      );
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope ? data.scope.split(" ").filter(Boolean) : [],
    };
  }

  /**
   * Obtiene la metadata de la cuenta conectada (email como nombre legible e id
   * del usuario en el proveedor) para registrarla en la integración (R1.4).
   *
   * @throws BadGatewayException si Google no está disponible.
   */
  async fetchAccountMetadata(
    accessToken: string,
  ): Promise<ProviderAccountMetadata> {
    const response = await this.makeRequest(GOOGLE_USERINFO_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await this.parseResponse<GoogleUserInfoResponse>(response);

    return {
      accountDisplayName: data.email,
      providerAccountId: data.id,
    };
  }

  /**
   * Revoca un token (access o refresh) en Google, invalidando la concesión
   * OAuth de la cuenta (R6.2). Revocar el `refresh_token` invalida toda la
   * cadena de tokens derivados.
   *
   * @throws BadRequestException si el token ya es inválido o la revocación falla.
   * @throws BadGatewayException si Google no está disponible.
   */
  async revokeAccess(token: string): Promise<void> {
    const body = new URLSearchParams({ token });

    await this.makeRequest(GOOGLE_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Ejecuta una solicitud HTTP a Google con manejo de errores de red y de
   * estado. Errores 4xx → BadRequestException; 5xx/red → BadGatewayException.
   */
  private async makeRequest(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      return response;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }

      this.logger.error(
        `Error de red llamando a Google: ${(error as Error).message}`,
      );
      throw new BadGatewayException(
        "Google no está disponible temporalmente. Intenta de nuevo.",
      );
    }
  }

  /** Parsea la respuesta JSON; ante cuerpo inválido lanza BadGatewayException. */
  private async parseResponse<T>(response: Response): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch {
      throw new BadGatewayException("Respuesta inválida de Google.");
    }
  }

  /** Mapea un error HTTP de Google a una excepción del backend. */
  private async handleHttpError(response: Response): Promise<never> {
    let detail = `HTTP ${response.status}`;
    try {
      const errorBody = (await response.json()) as {
        error?: string;
        error_description?: string;
      };
      detail = errorBody.error_description || errorBody.error || detail;
    } catch {
      // Cuerpo de error no parseable; se conserva el status HTTP.
    }

    this.logger.warn(`Error de Google: status=${response.status}, detail=${detail}`);

    if (response.status >= 500) {
      throw new BadGatewayException(
        "Google no está disponible temporalmente. Intenta de nuevo.",
      );
    }

    throw new BadRequestException(`Error en la comunicación con Google: ${detail}`);
  }
}
