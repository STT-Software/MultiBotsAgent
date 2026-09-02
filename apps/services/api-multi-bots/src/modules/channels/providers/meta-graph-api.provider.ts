import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Información del número de teléfono obtenida de Meta Graph API.
 */
export interface PhoneNumberInfo {
  displayPhoneNumber: string;
  verifiedName: string;
}

/**
 * Estructura de error retornada por Meta Graph API.
 */
interface MetaApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * Mapeo de códigos de error de Meta a excepciones HTTP del backend.
 */
const META_ERROR_MAP: Record<number, { httpStatus: number; message: string }> = {
  190: { httpStatus: 400, message: 'Token de autorización inválido o expirado' },
  100: { httpStatus: 400, message: 'Parámetros inválidos en la solicitud a Meta' },
  10: { httpStatus: 409, message: 'El número ya está registrado en otra aplicación' },
  133005: { httpStatus: 400, message: 'El PIN de verificación en dos pasos no coincide' },
  4: { httpStatus: 502, message: 'Meta Graph API no disponible temporalmente' },
};

/**
 * Provider que encapsula todas las llamadas HTTP a Meta Graph API v21.0.
 *
 * Responsabilidades:
 * - Intercambiar Token Code por Business Token (OAuth)
 * - Registrar número de teléfono en Cloud API
 * - Suscribir aplicación a webhooks del WABA
 * - Configurar webhook override para un Phone Number ID
 * - Obtener información del número de teléfono
 *
 * Obtiene App ID y App Secret de variables de entorno (SST Secrets).
 *
 * @see Requirements 3.1, 4.1, 5.1, 6.1
 */
@Injectable()
export class MetaGraphApiProvider {
  private readonly logger = new Logger(MetaGraphApiProvider.name);
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';
  private readonly appId: string;
  private readonly appSecret: string;

  constructor() {
    this.appId = process.env.META_APP_ID || '';
    this.appSecret = process.env.META_APP_SECRET || '';

    if (!this.appId || !this.appSecret) {
      this.logger.warn(
        'META_APP_ID or META_APP_SECRET not configured. Meta Graph API calls will fail.',
      );
    }
  }

  /**
   * Intercambia un Token Code (código de autorización de corta duración) por un
   * Business Token de larga duración mediante Meta Graph API OAuth.
   *
   * @param tokenCode - Código de autorización obtenido del flujo de Embedded Signup
   * @returns Business Token de larga duración
   * @throws BadRequestException si el token es inválido o expirado
   * @throws BadGatewayException si Meta no está disponible
   *
   * @see Requirement 3.1
   */
  async exchangeToken(tokenCode: string): Promise<string> {
    const url = new URL(`${this.baseUrl}/oauth/access_token`);
    url.searchParams.set('client_id', this.appId);
    url.searchParams.set('client_secret', this.appSecret);
    url.searchParams.set('code', tokenCode);
    // El diálogo de OAuth que abre el SDK de JavaScript usa un redirect_uri vacío.
    // Meta distingue entre omitir el parámetro y enviarlo vacío: al omitirlo rechaza
    // el código con "Error validating verification code".
    url.searchParams.set('redirect_uri', '');

    // Diagnóstico sin exponer la credencial: longitud y prefijo bastan para
    // distinguir un código ausente o truncado de uno rechazado por Meta.
    this.logger.debug(
      `Exchanging Embedded Signup code (length=${tokenCode?.length ?? 0}, prefix=${tokenCode?.slice(0, 6) ?? 'none'})`,
    );

    const response = await this.makeRequest(url.toString(), { method: 'GET' });
    const data = await this.parseResponse<{ access_token: string }>(response);

    if (!data.access_token) {
      throw new BadRequestException(
        'Token de autorización inválido o expirado',
      );
    }

    return data.access_token;
  }

  /**
   * Registra un número de teléfono en WhatsApp Cloud API.
   *
   * @param phoneNumberId - ID del número de teléfono asignado por Meta
   * @param token - Business Token para autenticación
   * @param pin - PIN de verificación en dos pasos (opcional, por defecto 000000)
   * @throws ConflictException si el número ya está registrado por otra app
   * @throws BadRequestException si los parámetros son inválidos
   * @throws BadGatewayException si Meta no está disponible
   *
   * @see Requirement 4.1
   */
  async registerPhoneNumber(
    phoneNumberId: string,
    token: string,
    pin: string = '000000',
  ): Promise<void> {
    const url = `${this.baseUrl}/${phoneNumberId}/register`;

    await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin,
      }),
    });
  }

  /**
   * Suscribe la aplicación a los webhooks de un WABA (WhatsApp Business Account).
   *
   * @param wabaId - ID del WhatsApp Business Account
   * @param token - Business Token para autenticación
   * @throws BadGatewayException si Meta no está disponible
   *
   * @see Requirement 5.1
   */
  async subscribeWebhooks(wabaId: string, token: string): Promise<void> {
    const url = `${this.baseUrl}/${wabaId}/subscribed_apps`;

    await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Configura el webhook override para un Phone Number ID, dirigiendo los
   * mensajes entrantes a la URL personalizada de la plataforma.
   *
   * @param phoneNumberId - ID del número de teléfono
   * @param token - Business Token para autenticación
   * @param callbackUrl - URL del webhook de la plataforma
   * @throws BadGatewayException si Meta no está disponible
   *
   * @see Requirement 6.1
   */
  async setWebhookOverride(
    phoneNumberId: string,
    token: string,
    callbackUrl: string,
  ): Promise<void> {
    const url = `${this.baseUrl}/${phoneNumberId}/whatsapp_business_profile`;

    await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        webhooks: {
          override_callback_uri: callbackUrl,
        },
      }),
    });
  }

  /**
   * Obtiene información del número de teléfono desde Meta Graph API.
   *
   * @param phoneNumberId - ID del número de teléfono
   * @param token - Business Token para autenticación
   * @returns Información del número (display_phone_number, verified_name)
   * @throws BadRequestException si el phoneNumberId es inválido
   * @throws BadGatewayException si Meta no está disponible
   */
  async getPhoneNumberInfo(
    phoneNumberId: string,
    token: string,
  ): Promise<PhoneNumberInfo> {
    const url = new URL(`${this.baseUrl}/${phoneNumberId}`);
    url.searchParams.set('fields', 'display_phone_number,verified_name');

    const response = await this.makeRequest(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await this.parseResponse<{
      display_phone_number: string;
      verified_name: string;
    }>(response);

    return {
      displayPhoneNumber: data.display_phone_number,
      verifiedName: data.verified_name,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Ejecuta una solicitud HTTP a Meta Graph API con manejo de errores de red.
   */
  private async makeRequest(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        await this.handleMetaError(response);
      }

      return response;
    } catch (error) {
      // Si ya es una excepción HTTP de NestJS, re-lanzarla
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof BadGatewayException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Error de red (timeout, DNS, conexión rechazada)
      this.logger.error(
        `Network error calling Meta Graph API: ${(error as Error).message}`,
      );
      throw new BadGatewayException(
        'Meta Graph API no disponible temporalmente',
      );
    }
  }

  /**
   * Parsea la respuesta JSON de Meta Graph API.
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch {
      throw new BadGatewayException(
        'Respuesta inválida de Meta Graph API',
      );
    }
  }

  /**
   * Maneja errores HTTP de Meta Graph API, mapeando códigos de error de Meta
   * a excepciones HTTP apropiadas del backend.
   */
  private async handleMetaError(response: Response): Promise<never> {
    let metaError: MetaApiErrorResponse | null = null;

    try {
      metaError = (await response.json()) as MetaApiErrorResponse;
    } catch {
      // No se pudo parsear el error de Meta
    }

    if (metaError?.error?.code) {
      const mapped = META_ERROR_MAP[metaError.error.code];

      if (mapped) {
        this.logger.warn(
          `Meta Graph API error: code=${metaError.error.code}, subcode=${metaError.error.error_subcode ?? 'none'}, type=${metaError.error.type}, fbtrace_id=${metaError.error.fbtrace_id ?? 'none'}, message=${metaError.error.message}`,
        );

        switch (mapped.httpStatus) {
          case 400:
            throw new BadRequestException(mapped.message);
          case 409:
            throw new ConflictException(mapped.message);
          case 502:
            throw new BadGatewayException(mapped.message);
          default:
            throw new InternalServerErrorException('Error interno del servidor');
        }
      }
    }

    // Error no mapeado — usar el status HTTP de la respuesta como guía
    const statusCode = response.status;
    const errorMessage =
      metaError?.error?.message || `Meta Graph API returned HTTP ${statusCode}`;

    this.logger.warn(`Unmapped Meta Graph API error: status=${statusCode}, message=${errorMessage}`);

    if (statusCode >= 500) {
      throw new BadGatewayException(
        'Meta Graph API no disponible temporalmente',
      );
    }

    throw new BadRequestException(
      `Error en la comunicación con Meta Graph API: ${errorMessage}`,
    );
  }
}
