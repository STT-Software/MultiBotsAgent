import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  IntegrationProvider,
  IntegrationStatus,
  type Integration,
  type IntegrationSummary,
  type OAuthCallbackResult,
} from "@multibotagents/types";
import { OAuthStateService, encryptToken, decryptToken } from "@multibotagents/core";
import type {
  IIntegrationRepository,
  CreateIntegrationData,
} from "@multibotagents/db";
import {
  getProviderOAuthConfig,
  isProviderSupported,
  resolveClientCredentials,
  type ProviderOAuthConfig,
} from "./oauth";
import {
  GoogleDriveAdapter,
  type OAuthTokenResult,
  type ProviderAccountMetadata,
} from "./providers";

/** Contexto del flujo recuperado al validar el `state`. */
interface CallbackContext {
  companyId: string;
  provider: IntegrationProvider;
  agentId?: string;
}

/**
 * Pistas de scopes de identidad (no funcionales). No se consideran al evaluar
 * permisos insuficientes: solo aportan metadata de la cuenta.
 */
const IDENTITY_SCOPE_HINTS = ["userinfo", "openid", "email", "profile"];

/**
 * Fachada del flujo OAuth de integraciones (SL13, slice 1).
 *
 * Orquesta la generación de la URL de autorización y el procesamiento del
 * callback (validación del `state`, intercambio de tokens, lectura de metadata,
 * cifrado y persistencia). El proveedor se resuelve siempre desde el `state`.
 */
@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @Inject("INTEGRATION_REPO")
    private readonly integrationRepository: IIntegrationRepository,
    private readonly oauthStateService: OAuthStateService,
    private readonly googleDriveAdapter: GoogleDriveAdapter,
  ) {}

  /**
   * Construye la URL de autorización del proveedor y emite/persiste el `state`
   * (R1.1, R1.2). El proveedor debe estar soportado.
   *
   * @throws BadRequestException si el proveedor no está soportado.
   */
  async buildAuthorizationUrl(
    companyId: string,
    provider: IntegrationProvider,
    agentId?: string,
  ): Promise<{ authorizationUrl: string }> {
    if (!isProviderSupported(provider)) {
      throw new BadRequestException(
        `El proveedor "${provider}" aún no está disponible para conectar.`,
      );
    }

    const config = getProviderOAuthConfig(provider);
    const { clientId } = resolveClientCredentials(config);

    const state = await this.oauthStateService.issue({
      companyId,
      provider,
      agentId,
    });

    const url = new URL(config.authorizationUrl);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", this.getRedirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scopes.join(" "));
    url.searchParams.set("state", state);
    for (const [key, value] of Object.entries(config.authorizationParams ?? {})) {
      url.searchParams.set(key, value);
    }

    return { authorizationUrl: url.toString() };
  }

  /**
   * Procesa el callback OAuth y retorna el resultado para que el controlador
   * redirija al panel. Nunca lanza: todos los caminos de fallo se traducen a un
   * `OAuthCallbackResult` (R1.3–R1.10).
   */
  async handleCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<OAuthCallbackResult> {
    // 1. El proveedor devolvió un error (p. ej. el usuario canceló) — R1.7.
    if (query.error) {
      return query.error === "access_denied" ? "access_denied" : "exchange_failed";
    }

    // 2. Validar y consumir el `state` (firma + TTL + único uso) — R1.6, R1.10.
    let context: CallbackContext;
    try {
      context = await this.oauthStateService.validateAndConsume(query.state ?? "");
    } catch {
      return "state_expired";
    }

    if (!query.code) {
      return "exchange_failed";
    }

    // 3. Intercambiar el `code`, leer metadata, cifrar y persistir.
    try {
      const config = getProviderOAuthConfig(context.provider);
      const adapter = this.getOAuthAdapter(context.provider);

      const tokens = await adapter.exchangeCodeForTokens(
        query.code,
        this.getRedirectUri(),
      );
      const metadata = await adapter.fetchAccountMetadata(tokens.accessToken);

      const missingScopes = this.findMissingScopes(config.scopes, tokens.scopes);
      const status = missingScopes.length
        ? IntegrationStatus.INSUFFICIENT_SCOPES
        : IntegrationStatus.CONNECTED;

      await this.persistIntegration(context, config, tokens, metadata, status);

      return missingScopes.length ? "insufficient_scopes" : "success";
    } catch (error) {
      // R1.8: ante fallo del intercambio no se almacena nada.
      this.logger.error(
        `Fallo procesando el callback OAuth de ${context.provider}: ${(error as Error).message}`,
      );
      return "exchange_failed";
    }
  }

  /**
   * Lista las integraciones de una empresa como `IntegrationSummary[]`, la única
   * proyección que viaja al frontend: excluye deliberadamente los campos
   * `encrypted*` y `tokenExpiresAt` (R7.1, R7.4).
   */
  async listIntegrations(companyId: string): Promise<IntegrationSummary[]> {
    const integrations =
      await this.integrationRepository.findByCompanyId(companyId);
    return integrations.map((integration) => this.toSummary(integration));
  }

  /**
   * Desconecta una integración de la empresa: valida la pertenencia, revoca el
   * token en el proveedor (best-effort) y elimina el material cifrado dejando la
   * integración en estado `disconnected` (R6, R7).
   *
   * @throws NotFoundException si la integración no existe o no pertenece a la empresa.
   */
  async disconnect(
    companyId: string,
    integrationId: string,
  ): Promise<IntegrationSummary> {
    const integration = await this.integrationRepository.findById(integrationId);

    // No revelamos la existencia de integraciones de otras empresas.
    if (!integration || integration.companyId !== companyId) {
      throw new NotFoundException("Integración no encontrada.");
    }

    // R6.2/R6.3: revocar es best-effort; un fallo no debe impedir la limpieza.
    await this.tryRevokeProviderAccess(integration);

    const updated = await this.integrationRepository.disconnect(integrationId);

    this.logger.log(
      `Integración ${integration.provider} desconectada para la empresa ${companyId}.`,
    );

    return this.toSummary(updated);
  }

  /**
   * Intenta revocar la concesión OAuth en el proveedor antes de eliminar los
   * tokens. Nunca lanza: si el proveedor no soporta revocación o la llamada
   * falla, se registra y la desconexión continúa (R6.3).
   */
  private async tryRevokeProviderAccess(
    integration: Integration,
  ): Promise<void> {
    const encrypted =
      integration.encryptedRefreshToken ?? integration.encryptedAccessToken;
    if (!encrypted) {
      return;
    }

    try {
      const adapter = this.getOAuthAdapter(integration.provider);
      const token = decryptToken(encrypted, this.getEncryptionKey());
      await adapter.revokeAccess(token);
    } catch (error) {
      this.logger.warn(
        `No se pudo revocar el token de ${integration.provider} ` +
          `(se continúa con la desconexión): ${(error as Error).message}`,
      );
    }
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────

  /**
   * Proyecta una `Integration` a su `IntegrationSummary` seguro, dejando fuera
   * los tokens cifrados y cualquier dato sensible.
   */
  private toSummary(integration: Integration): IntegrationSummary {
    return {
      id: integration.id,
      provider: integration.provider,
      category: integration.category,
      status: integration.status,
      accountDisplayName: integration.accountDisplayName,
      scopes: integration.scopes,
      calendarId: integration.calendarId,
      lastHealthCheck: integration.lastHealthCheck,
      connectedAt: integration.connectedAt,
      lastUsedAt: integration.lastUsedAt,
    };
  }

  /** Selecciona el adaptador OAuth del proveedor (slice 1: solo Google Drive). */
  private getOAuthAdapter(provider: IntegrationProvider): GoogleDriveAdapter {
    if (provider === IntegrationProvider.GOOGLE_DRIVE) {
      return this.googleDriveAdapter;
    }
    throw new BadRequestException(`Proveedor no soportado: ${provider}`);
  }

  /**
   * Cifra los tokens y crea/reemplaza la integración del proveedor para la
   * empresa (R1.4). El índice único `{companyId, provider}` hace de la
   * reconexión un reemplazo idempotente.
   */
  private async persistIntegration(
    context: CallbackContext,
    config: ProviderOAuthConfig,
    tokens: OAuthTokenResult,
    metadata: ProviderAccountMetadata,
    status: IntegrationStatus,
  ): Promise<void> {
    const encryptionKey = this.getEncryptionKey();

    const data: CreateIntegrationData = {
      companyId: context.companyId,
      provider: context.provider,
      category: config.category,
      status,
      encryptedAccessToken: encryptToken(tokens.accessToken, encryptionKey),
      encryptedRefreshToken: tokens.refreshToken
        ? encryptToken(tokens.refreshToken, encryptionKey)
        : undefined,
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      accountDisplayName: metadata.accountDisplayName,
      providerAccountId: metadata.providerAccountId,
      connectedAt: new Date(),
    };

    await this.integrationRepository.upsertByCompanyAndProvider(data);
  }

  /**
   * Devuelve los scopes funcionales requeridos que el proveedor no concedió.
   * Ignora los scopes de identidad (solo aportan metadata), evitando falsos
   * positivos de "permisos insuficientes" (R1.9).
   */
  private findMissingScopes(required: string[], granted: string[]): string[] {
    return required.filter(
      (scope) => !this.isIdentityScope(scope) && !granted.includes(scope),
    );
  }

  private isIdentityScope(scope: string): boolean {
    return IDENTITY_SCOPE_HINTS.some((hint) => scope.includes(hint));
  }

  /** Clave de cifrado AES-256-GCM de los tokens, leída del entorno. */
  private getEncryptionKey(): string {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY no está configurada en el servidor.");
    }
    return encryptionKey;
  }

  /** URL del callback único, registrada en el proveedor (debe coincidir exacto). */
  private getRedirectUri(): string {
    const redirectUri = process.env.INTEGRATIONS_OAUTH_REDIRECT_URI;
    if (!redirectUri) {
      throw new Error(
        "INTEGRATIONS_OAUTH_REDIRECT_URI no está configurada en el servidor.",
      );
    }
    return redirectUri;
  }
}
