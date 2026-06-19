import type { IntegrationProvider } from '@multibotagents/types';

/**
 * Metadata de presentación de un proveedor en el panel.
 * Slice 1 solo describe Google Drive; el resto se añade en slices posteriores.
 */
export interface ProviderCardConfig {
  /** Proveedor al que corresponde la tarjeta. */
  provider: IntegrationProvider;
  /** Nombre legible mostrado en la tarjeta. */
  name: string;
  /** Descripción breve de para qué sirve la conexión. */
  description: string;
  /** Nombre del icono de `lucide-react` a renderizar. */
  icon: string;
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
