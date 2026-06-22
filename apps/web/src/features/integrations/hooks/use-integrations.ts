'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IntegrationSummary } from '@multibotagents/types';
import { getIntegrations, disconnectIntegration } from '../services';
import type { ConnectionFeedback } from '../types';

interface UseIntegrationsReturn {
  /** Integraciones vivas de la empresa, indexadas por proveedor. */
  integrations: IntegrationSummary[];
  /** Cargando el listado inicial. */
  isLoading: boolean;
  /** Hubo un error al cargar el listado (R7.5). */
  loadError: boolean;
  /** Id de la integración cuya desconexión está en curso (deshabilita su acción). */
  disconnectingId: string | null;
  /** Mensaje de resultado de una acción (desconexión ok/fallida). */
  feedback: ConnectionFeedback | null;
  /** Desconecta una integración por id y refresca el estado local. */
  disconnect: (integrationId: string) => Promise<void>;
  /** Vuelve a cargar el listado desde el backend. */
  refresh: () => Promise<void>;
  /** Descarta el mensaje de feedback. */
  dismissFeedback: () => void;
}

/**
 * Carga y gestiona el listado de integraciones de la empresa (SL13, slice 2):
 * trae `GET /integrations` al montar y expone la desconexión (`DELETE
 * /integrations/:id`) actualizando el estado local sin recargar la página.
 */
export function useIntegrations(): UseIntegrationsReturn {
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ConnectionFeedback | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      setIntegrations(await getIntegrations());
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const disconnect = useCallback(async (integrationId: string) => {
    setDisconnectingId(integrationId);
    setFeedback(null);
    try {
      const updated = await disconnectIntegration(integrationId);
      // Reemplaza la integración por su versión desconectada (sin recargar).
      setIntegrations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setFeedback({
        variant: 'success',
        message: 'La integración se desconectó correctamente.',
      });
    } catch {
      setFeedback({
        variant: 'error',
        message: 'No se pudo desconectar la integración. Intenta de nuevo.',
      });
    } finally {
      setDisconnectingId(null);
    }
  }, []);

  const dismissFeedback = useCallback(() => setFeedback(null), []);

  return {
    integrations,
    isLoading,
    loadError,
    disconnectingId,
    feedback,
    disconnect,
    refresh,
    dismissFeedback,
  };
}
