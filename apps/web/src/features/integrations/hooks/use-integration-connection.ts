'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { IntegrationProvider } from '@multibotagents/types';
import { getAuthorizationUrl } from '../services';
import { CONNECTION_FEEDBACK } from '../constants';
import type { ConnectionFeedback, ConnectionStatus } from '../types';

/** Ruta del panel donde vive la sección de integraciones. */
const PANEL_PATH = '/integraciones';

/**
 * Clave de `sessionStorage` donde se guarda el proveedor en curso antes de
 * redirigir al proveedor OAuth. Al volver del callback permite saber qué
 * tarjeta marcar como conectada (el `?status=` no transporta el proveedor).
 */
const PENDING_PROVIDER_KEY = 'integrations:pendingProvider';

interface UseIntegrationConnectionReturn {
  /** Proveedor cuyo flujo de autorización se está iniciando (deshabilita su botón). */
  connectingProvider: IntegrationProvider | null;
  /** Proveedor que acaba de conectarse en esta sesión (estado efímero del slice 1). */
  connectedProvider: IntegrationProvider | null;
  /** Mensaje de retorno del callback o de error al iniciar la conexión. */
  feedback: ConnectionFeedback | null;
  /** Inicia el flujo OAuth del proveedor y redirige a su pantalla de autorización. */
  connect: (provider: IntegrationProvider) => Promise<void>;
  /** Descarta el mensaje de feedback. */
  dismissFeedback: () => void;
}

function isConnectionStatus(value: string | null): value is ConnectionStatus {
  return value !== null && value in CONNECTION_FEEDBACK;
}

/**
 * Gestiona la conexión OAuth de un proveedor desde el panel (slice 1, SL13):
 * inicia la autorización con redirección al proveedor y procesa el retorno del
 * callback leyendo el parámetro `?status=` (R1.5, R1.7).
 *
 * El estado "conectado" es efímero (solo esta sesión): el listado persistente
 * de integraciones llega con el endpoint `GET /integrations` del slice 2.
 */
export function useIntegrationConnection(): UseIntegrationConnectionReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connectingProvider, setConnectingProvider] =
    useState<IntegrationProvider | null>(null);
  const [connectedProvider, setConnectedProvider] =
    useState<IntegrationProvider | null>(null);
  const [feedback, setFeedback] = useState<ConnectionFeedback | null>(null);

  // Procesa el retorno del callback (?status=) una sola vez al montar.
  useEffect(() => {
    const status = searchParams.get('status');
    if (!isConnectionStatus(status)) return;

    setFeedback(CONNECTION_FEEDBACK[status]);

    const pending = window.sessionStorage.getItem(
      PENDING_PROVIDER_KEY,
    ) as IntegrationProvider | null;
    if (status === 'success' && pending) {
      setConnectedProvider(pending);
    }
    window.sessionStorage.removeItem(PENDING_PROVIDER_KEY);

    // Limpia el query param para que el feedback no reaparezca al recargar.
    router.replace(PANEL_PATH);
    // Solo debe ejecutarse al montar: el callback llega una vez por navegación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async (provider: IntegrationProvider) => {
    setConnectingProvider(provider);
    setFeedback(null);
    try {
      const authorizationUrl = await getAuthorizationUrl(provider);
      // Recordar el proveedor para reconocerlo al volver del callback.
      window.sessionStorage.setItem(PENDING_PROVIDER_KEY, provider);
      window.location.href = authorizationUrl;
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'No se pudo iniciar la conexión. Intenta de nuevo.';
      setFeedback({ variant: 'error', message });
      setConnectingProvider(null);
    }
  }, []);

  const dismissFeedback = useCallback(() => setFeedback(null), []);

  return {
    connectingProvider,
    connectedProvider,
    feedback,
    connect,
    dismissFeedback,
  };
}
