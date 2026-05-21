/**
 * Adaptador de envío de email mediante Elastic Email API v4 REST.
 *
 * Implementa la interfaz IEmailSender para enviar emails transaccionales
 * usando templates registrados en Elastic Email.
 *
 * - Usa API v4 (POST /v4/emails/transactional con JSON)
 * - Timeout de 10 segundos por solicitud HTTP (AbortController)
 * - API key, from email, from name y template ID inyectados via config
 * - Manejo de errores HTTP (4xx/5xx) y de red (timeout, DNS)
 * - Valida que los secrets estén configurados antes de intentar enviar
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface SendEmailParams {
  to: string;
  templateId: string;
  mergeFields: Record<string, string>;
  from: { email: string; name: string };
  subject?: string;
}

export interface IEmailSender {
  send(params: SendEmailParams): Promise<void>;
}

export interface ElasticEmailSenderConfig {
  /** API key de Elastic Email (desde SST Secrets). */
  apiKey: string;
  /** Email del remitente (desde SST Secrets). */
  fromEmail: string;
  /** Nombre del remitente (desde SST Secrets). */
  fromName: string;
  /** Nombre del template en Elastic Email. */
  templateId: string;
  /** URL base de la API de Elastic Email. Default: https://api.elasticemail.com */
  apiBaseUrl?: string;
}

// ─── Errores ─────────────────────────────────────────────────────────────────

export class ElasticEmailHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(
      `Elastic Email API error: HTTP ${statusCode} - ${responseBody}`,
    );
    this.name = 'ElasticEmailHttpError';
  }
}

export class ElasticEmailNetworkError extends Error {
  constructor(
    public readonly cause: unknown,
  ) {
    const message = cause instanceof Error ? cause.message : 'Unknown network error';
    super(`Elastic Email network error: ${message}`);
    this.name = 'ElasticEmailNetworkError';
  }
}

// ─── Implementación ──────────────────────────────────────────────────────────

/** Timeout en milisegundos para solicitudes HTTP a Elastic Email. */
const HTTP_TIMEOUT_MS = 10_000;

/** URL base por defecto de la API de Elastic Email. */
const DEFAULT_API_BASE_URL = 'https://api.elasticemail.com';

export class ElasticEmailSender implements IEmailSender {
  private readonly config: Required<ElasticEmailSenderConfig>;

  constructor(config: ElasticEmailSenderConfig) {
    this.config = {
      ...config,
      apiBaseUrl: config.apiBaseUrl ?? DEFAULT_API_BASE_URL,
    };
  }

  /**
   * Envía un email transaccional usando Elastic Email API v4 con template.
   *
   * @param params - Parámetros del email a enviar
   * @throws {ElasticEmailHttpError} Si la API retorna un error o los secrets no están configurados
   * @throws {ElasticEmailNetworkError} Si hay error de red (timeout, DNS, conexión rechazada)
   */
  async send(params: SendEmailParams): Promise<void> {
    if (!this.config.apiKey) {
      throw new ElasticEmailHttpError(401, 'ELASTIC_EMAIL_API_KEY is not configured');
    }
    if (!this.config.fromEmail) {
      throw new ElasticEmailHttpError(400, 'ELASTIC_EMAIL_FROM_EMAIL is not configured');
    }

    const url = `${this.config.apiBaseUrl}/v4/emails/transactional`;
    const body = this.buildRequestBody(params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ElasticEmail-ApiKey': this.config.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text().catch(() => 'Unable to read response body');
        throw new ElasticEmailHttpError(response.status, responseBody);
      }

      // API v4 returns 200 with TransactionID on success
      const responseData = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (responseData && !responseData.TransactionID && !responseData.MessageID) {
        throw new ElasticEmailHttpError(
          200,
          JSON.stringify(responseData),
        );
      }
    } catch (error) {
      if (error instanceof ElasticEmailHttpError) {
        throw error;
      }
      throw new ElasticEmailNetworkError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Construye el body JSON para la API v4 de Elastic Email.
   *
   * Formato v4:
   * {
   *   "Recipients": { "To": ["email@example.com"] },
   *   "Content": {
   *     "From": "Name <email>",
   *     "TemplateName": "template-name",
   *     "Merge": { "field": "value" }
   *   }
   * }
   */
  private buildRequestBody(params: SendEmailParams): Record<string, unknown> {
    return {
      Recipients: {
        To: [params.to],
      },
      Content: {
        From: `${params.from.name} <${params.from.email}>`,
        Subject: params.subject || 'Verifica tu email - MultiBotAgents',
        TemplateName: params.templateId,
        Merge: params.mergeFields,
      },
    };
  }
}
