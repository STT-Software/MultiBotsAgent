import { IntegrationCategory, IntegrationProvider } from '@multibotagents/types';
import type {
  ConnectionFeedback,
  ConnectionStatus,
  ProviderCardConfig,
} from '../types';

/**
 * Proveedores conectables desde el panel.
 * Slice 1 (SL13) solo habilita Google Drive; los demás llegan en slices 4 y 5.
 */
export const PROVIDER_CARDS: ProviderCardConfig[] = [
  {
    provider: IntegrationProvider.GOOGLE_DRIVE,
    category: IntegrationCategory.DOCUMENT_SOURCE,
    name: 'Google Drive',
    description:
      'Conecta tu Drive para que los agentes consulten tus documentos como fuente de conocimiento.',
    icon: 'HardDrive',
  },
];

/**
 * Etiquetas legibles de cada categoría, para los encabezados de sección del
 * listado (R7.1). El orden define el orden de aparición en el panel.
 */
export const CATEGORY_LABELS: Array<{
  category: IntegrationCategory;
  label: string;
}> = [
  { category: IntegrationCategory.DOCUMENT_SOURCE, label: 'Fuentes de documentos' },
  { category: IntegrationCategory.CALENDAR, label: 'Calendario' },
];

/**
 * Mensajes mostrados al volver del callback OAuth, indexados por el valor del
 * parámetro `?status=` (R1.5 éxito, R1.7 cancelación e informativos de error).
 */
export const CONNECTION_FEEDBACK: Record<ConnectionStatus, ConnectionFeedback> = {
  success: {
    variant: 'success',
    message: 'La conexión se completó correctamente.',
  },
  access_denied: {
    variant: 'error',
    message: 'Cancelaste la autorización. No se guardó ninguna conexión.',
  },
  state_expired: {
    variant: 'error',
    message: 'El proceso expiró, intenta de nuevo.',
  },
  insufficient_scopes: {
    variant: 'error',
    message:
      'Faltan permisos necesarios para usar la integración. Reintenta concediendo todos los accesos solicitados.',
  },
  exchange_failed: {
    variant: 'error',
    message: 'No se pudo completar la conexión. Por favor intenta de nuevo.',
  },
};
