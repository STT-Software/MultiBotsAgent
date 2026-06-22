import type {
  IntegrationCategory,
  IntegrationProvider,
  IntegrationSummary,
} from '@multibotagents/types';

/**
 * Metadata de presentación de un proveedor en el panel.
 * Slice 1 solo describe Google Drive; el resto se añade en slices posteriores.
 */
export interface ProviderCardConfig {
  /** Proveedor al que corresponde la tarjeta. */
  provider: IntegrationProvider;
  /** Categoría bajo la que se agrupa la tarjeta en el panel. */
  category: IntegrationCategory;
  /** Nombre legible mostrado en la tarjeta. */
  name: string;
  /** Descripción breve de para qué sirve la conexión. */
  description: string;
  /** Nombre del icono de `lucide-react` a renderizar. */
  icon: string;
}

/**
 * Estado visual derivado de una tarjeta, combinando el catálogo estático con la
 * integración viva (si existe) que devuelve `GET /integrations`.
 *
 * - `not_connected`: nunca se conectó (sin integración o `disconnected`).
 * - `connected`: operativa, con cuenta vinculada.
 * - `requires_reconnection`: el token se revocó/expiró; pide reconectar.
 * - `insufficient_scopes`: faltaron permisos; pide reconectar concediéndolos.
 */
export type CardState =
  | 'not_connected'
  | 'connected'
  | 'requires_reconnection'
  | 'insufficient_scopes';

/**
 * Vista de una tarjeta: su configuración estática + la integración viva
 * asociada (o `null` si el proveedor no está conectado).
 */
export interface ProviderCardView {
  config: ProviderCardConfig;
  integration: IntegrationSummary | null;
}

/**
 * Resultado del flujo de conexión tal como llega en el parámetro `?status=`
 * con el que el backend redirige al panel tras el callback OAuth.
 *
 * Refleja los valores de `OAuthCallbackResult` (`@multibotagents/types`).
 */
export type ConnectionStatus =
  | 'success'
  | 'state_expired'
  | 'access_denied'
  | 'insufficient_scopes'
  | 'exchange_failed';

/** Variante visual del mensaje de retorno del callback. */
export type ConnectionFeedbackVariant = 'success' | 'error';

/** Mensaje a mostrar al usuario para un resultado del callback. */
export interface ConnectionFeedback {
  variant: ConnectionFeedbackVariant;
  message: string;
}
