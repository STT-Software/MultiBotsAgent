/**
 * Tipos del dominio de Gestión de Integraciones Externas (SL13).
 *
 * Define la entidad `Integration` (vínculo OAuth entre una empresa y un
 * proveedor externo), sus enums de clasificación/estado y la proyección
 * `IntegrationSummary` que se expone hacia el frontend (sin tokens).
 *
 * Tenancy: una integración es por empresa (`companyId`), no por agente.
 */

import { EncryptedToken } from "../whatsapp/channel.types";

/**
 * Proveedores externos conectables.
 *
 * - Categoría `document_source`: google_drive, notion, confluence, sharepoint, dropbox.
 * - Categoría `calendar`: google_calendar.
 */
export enum IntegrationProvider {
  GOOGLE_DRIVE = "google_drive",
  NOTION = "notion",
  CONFLUENCE = "confluence",
  SHAREPOINT = "sharepoint",
  DROPBOX = "dropbox",
  GOOGLE_CALENDAR = "google_calendar",
}

/**
 * Clasificación del proveedor según el tipo de recurso que expone.
 */
export enum IntegrationCategory {
  DOCUMENT_SOURCE = "document_source",
  CALENDAR = "calendar",
}

/**
 * Estado de salud de una integración.
 *
 * - connected: operativa, con tokens válidos.
 * - disconnected: el usuario la desconectó; sin tokens almacenados.
 * - requires_reconnection: el refresh token fue revocado/expiró; requiere reconexión.
 * - insufficient_scopes: el proveedor concedió menos permisos de los necesarios.
 */
export enum IntegrationStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  REQUIRES_RECONNECTION = "requires_reconnection",
  INSUFFICIENT_SCOPES = "insufficient_scopes",
}

/**
 * Entidad de dominio `Integration`.
 *
 * Representa la conexión OAuth de una empresa con un proveedor externo.
 * Los tokens se almacenan cifrados (AES-256-GCM) y nunca se exponen al frontend.
 */
export interface Integration {
  id: string;
  companyId: string;
  provider: IntegrationProvider;
  category: IntegrationCategory;
  status: IntegrationStatus;
  /**
   * Access token cifrado AES-256-GCM. Ausente cuando la integración está
   * `disconnected`: la desconexión elimina todo el material de tokens (R6).
   */
  encryptedAccessToken?: EncryptedToken;
  /** Refresh token cifrado AES-256-GCM (si el proveedor lo emite). */
  encryptedRefreshToken?: EncryptedToken;
  /** Expiración del access token. */
  tokenExpiresAt?: Date;
  /** Scopes efectivamente concedidos por el proveedor. */
  scopes: string[];
  /** Nombre legible de la cuenta vinculada (email / workspace). */
  accountDisplayName?: string;
  /** Identificador del usuario/cuenta en el proveedor. */
  providerAccountId?: string;
  /** Calendario seleccionado por el usuario; solo aplica a `google_calendar`. */
  calendarId?: string;
  /** Última validación exitosa del token (health check). */
  lastHealthCheck?: Date;
  connectedAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Proyección segura de `Integration` hacia el frontend.
 *
 * Excluye deliberadamente todos los campos `encrypted*` y `tokenExpiresAt`:
 * el panel nunca debe recibir tokens ni datos sensibles (R7.4, NFR seguridad).
 */
export interface IntegrationSummary {
  id: string;
  provider: IntegrationProvider;
  category: IntegrationCategory;
  status: IntegrationStatus;
  accountDisplayName?: string;
  scopes: string[];
  calendarId?: string;
  lastHealthCheck?: Date;
  connectedAt?: Date;
  lastUsedAt?: Date;
}
