/**
 * DTOs del flujo OAuth 2.0 (Authorization Code Flow) de las integraciones (SL13).
 *
 * Definen el contrato entre el panel web y el backend para:
 *  1. Iniciar la autorización (`GET /integrations/oauth/authorize`).
 *  2. Procesar el callback del proveedor (`GET /integrations/oauth/callback`).
 *
 * Las versiones decoradas con `class-validator` viven en `apps/services`
 * (módulo NestJS); aquí se define la forma compartida del contrato.
 */

import { IntegrationProvider } from "./integration.types";

/**
 * Query del endpoint de autorización.
 * El panel indica qué proveedor desea conectar.
 */
export interface OAuthAuthorizeQuery {
  provider: IntegrationProvider;
  /** Agente al que se asocia el flujo, si aplica (opcional). */
  agentId?: string;
}

/**
 * Respuesta del endpoint de autorización.
 * El frontend redirige al `authorizationUrl` del proveedor.
 */
export interface OAuthAuthorizeResponse {
  authorizationUrl: string;
}

/**
 * Query del callback OAuth que el proveedor invoca tras la autorización.
 *
 * En el camino feliz llegan `code` + `state`. Ante una cancelación o error
 * del proveedor llegan `error` (`access_denied`, etc.) y `error_description`.
 */
export interface OAuthCallbackQuery {
  /** Código de autorización a intercambiar por tokens (camino feliz). */
  code?: string;
  /** State JWT firmado emitido al iniciar el flujo (anti-CSRF + contexto). */
  state: string;
  /** Código de error del proveedor (ej. `access_denied`). */
  error?: string;
  /** Descripción legible del error del proveedor. */
  error_description?: string;
  /** Scopes concedidos, separados por espacios (algunos proveedores lo envían). */
  scope?: string;
}

/**
 * Resultado del flujo de conexión, codificado en la redirección final al panel.
 */
export type OAuthCallbackResult =
  | "success"
  | "state_expired"
  | "access_denied"
  | "insufficient_scopes"
  | "exchange_failed";
