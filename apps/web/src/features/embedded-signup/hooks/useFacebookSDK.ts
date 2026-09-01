import { useState, useEffect, useCallback } from 'react';
import { EmbeddedSignupCallbackData } from '@multibotagents/types';
import { UseFacebookSDKReturn } from '../types';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
    fbq: any;
  }
}

/**
 * Tiempo máximo de espera, en milisegundos, entre que Meta devuelve el código de
 * autorización y que llega el evento con los identificadores de la cuenta.
 * Si se agota, se resuelve con error en lugar de dejar la promesa colgada.
 */
const SESSION_INFO_TIMEOUT_MS = 30_000;

/**
 * Valida que un origen pertenezca realmente a Meta.
 *
 * Se compara el host completo en lugar de usar `endsWith`, que aceptaría
 * dominios como `notfacebook.com`.
 */
function isMetaOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:') return false;
    return (
      hostname === 'facebook.com' ||
      hostname === 'web.facebook.com' ||
      hostname.endsWith('.facebook.com')
    );
  } catch {
    return false;
  }
}

export function useFacebookSDK(): UseFacebookSDKReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.FB) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) {
      setError('Falta configuración: NEXT_PUBLIC_META_APP_ID');
      setIsLoading(false);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      });
      setIsLoaded(true);
      setIsLoading(false);
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      setError('No se pudo cargar el componente de Meta. Verifica tu conexión o desactiva bloqueadores.');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
    };
  }, []);

  /**
   * Lanza el flujo de Embedded Signup de Meta.
   *
   * Meta entrega la información por dos canales distintos que hay que correlacionar:
   *
   * - El **código de autorización** llega en el callback de `FB.login`.
   * - Los **identificadores de la cuenta** (WABA y número) llegan por `postMessage`
   *   desde el iframe del flujo, en un evento de tipo `WA_EMBEDDED_SIGNUP`.
   *
   * El orden de llegada no está garantizado, así que se espera a tener ambas piezas
   * antes de resolver. Si el usuario cancela o Meta reporta un error, se resuelve
   * con `null` y se deja el motivo en `error`.
   */
  const launchEmbeddedSignup = useCallback((): Promise<EmbeddedSignupCallbackData | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.FB) {
        setError('El componente de Meta aún no está disponible. Espera unos segundos e inténtalo de nuevo.');
        resolve(null);
        return;
      }

      const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
      if (!configId) {
        setError('Falta configuración: NEXT_PUBLIC_META_CONFIG_ID');
        resolve(null);
        return;
      }

      setError(null);

      let wabaId: string | null = null;
      let phoneNumberId: string | null = null;
      let tokenCode: string | null = null;
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const settle = (value: EmbeddedSignupCallbackData | null) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('message', handleMessage);
        resolve(value);
      };

      // Solo se resuelve cuando llegaron las dos piezas.
      const settleIfComplete = () => {
        if (tokenCode && wabaId && phoneNumberId) {
          settle({ wabaId, phoneNumberId, tokenCode });
        }
      };

      function handleMessage(event: MessageEvent) {
        if (!isMetaOrigin(event.origin)) return;

        let payload: any;
        try {
          payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        } catch {
          return; // Mensaje ajeno al flujo, no es JSON.
        }

        if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return;

        const data = payload.data ?? {};

        switch (payload.event) {
          // Alta estándar y alta de un número que ya opera en la app de WhatsApp Business.
          case 'FINISH':
          case 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING':
            wabaId = data.waba_id ?? null;
            phoneNumberId = data.phone_number_id ?? null;
            settleIfComplete();
            break;

          // La empresa compartió la cuenta pero no un número: falta el dato que el backend necesita.
          case 'FINISH_ONLY_WABA':
            setError(
              'Se compartió la cuenta de WhatsApp Business pero no un número de teléfono. Repite el proceso seleccionando o creando un número.',
            );
            settle(null);
            break;

          case 'CANCEL':
            setError(
              data.current_step
                ? `Proceso cancelado en el paso: ${data.current_step}`
                : 'Proceso cancelado.',
            );
            settle(null);
            break;

          case 'ERROR':
            setError(data.error_message || 'Meta reportó un error durante el proceso.');
            settle(null);
            break;
        }
      }

      window.addEventListener('message', handleMessage);

      window.FB.login(
        (response: any) => {
          const code = response?.authResponse?.code;

          if (!code) {
            // Ventana cerrada sin autorizar. Si ya hubo un evento de cancelación
            // o error, ese mensaje es más específico y no se sobrescribe.
            if (!settled) {
              setError((prev) => prev ?? 'No se completó la autorización con Meta.');
            }
            settle(null);
            return;
          }

          tokenCode = code;
          settleIfComplete();

          // El código llegó pero aún no los identificadores: se espera un margen
          // acotado antes de darlo por fallido.
          if (!settled) {
            timeoutId = setTimeout(() => {
              setError(
                'Meta autorizó la conexión pero no envió los datos de la cuenta. Vuelve a intentarlo.',
              );
              settle(null);
            }, SESSION_INFO_TIMEOUT_MS);
          }
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
          },
        },
      );
    });
  }, []);

  return { isLoaded, isLoading, error, launchEmbeddedSignup };
}
