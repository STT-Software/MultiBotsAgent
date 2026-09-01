import { renderHook, act, waitFor } from '@testing-library/react';
import { useFacebookSDK } from '../useFacebookSDK';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const META_ORIGIN = 'https://www.facebook.com';

/** Emite un mensaje como lo haría el iframe del flujo de Meta. */
function emitMetaMessage(payload: unknown, origin: string = META_ORIGIN) {
  window.dispatchEvent(
    new MessageEvent('message', { data: JSON.stringify(payload), origin }),
  );
}

/** Instala un `FB.login` que deja el callback bajo control de la prueba. */
function stubFbLogin() {
  const captured: { cb?: (r: any) => void; options?: any } = {};
  window.FB = {
    init: vi.fn(),
    login: vi.fn((cb: (r: any) => void, options: any) => {
      captured.cb = cb;
      captured.options = options;
    }),
  };
  return captured;
}

describe('useFacebookSDK', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_META_APP_ID: 'test-app-id',
      NEXT_PUBLIC_META_CONFIG_ID: 'test-config-id',
    };
    delete (window as any).FB;
    delete (window as any).fbAsyncInit;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
  });

  it('carga el SDK correctamente', () => {
    const { result } = renderHook(() => useFacebookSDK());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoaded).toBe(false);

    act(() => {
      window.FB = { init: vi.fn(), login: vi.fn() };
      window.fbAsyncInit();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoaded).toBe(true);
  });

  it('invoca FB.login con los parámetros que exige Embedded Signup', async () => {
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    act(() => {
      result.current.launchEmbeddedSignup();
    });

    expect(fb.options).toMatchObject({
      config_id: 'test-config-id',
      response_type: 'code',
      override_default_response_type: true,
    });
  });

  it('resuelve cuando el evento de Meta llega antes que el código', async () => {
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      emitMetaMessage({
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'FINISH',
        data: { waba_id: 'waba-123', phone_number_id: 'phone-456' },
      });
      fb.cb!({ authResponse: { code: 'codigo-abc' } });
    });

    await expect(promise).resolves.toEqual({
      wabaId: 'waba-123',
      phoneNumberId: 'phone-456',
      tokenCode: 'codigo-abc',
    });
  });

  it('resuelve cuando el código llega antes que el evento de Meta', async () => {
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      fb.cb!({ authResponse: { code: 'codigo-abc' } });
      emitMetaMessage({
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'FINISH',
        data: { waba_id: 'waba-123', phone_number_id: 'phone-456' },
      });
    });

    await expect(promise).resolves.toEqual({
      wabaId: 'waba-123',
      phoneNumberId: 'phone-456',
      tokenCode: 'codigo-abc',
    });
  });

  it('acepta el alta de un número que ya opera en la app de WhatsApp Business', async () => {
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      emitMetaMessage({
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
        data: { waba_id: 'waba-coex', phone_number_id: 'phone-coex' },
      });
      fb.cb!({ authResponse: { code: 'codigo-coex' } });
    });

    await expect(promise).resolves.toEqual({
      wabaId: 'waba-coex',
      phoneNumberId: 'phone-coex',
      tokenCode: 'codigo-coex',
    });
  });

  it('ignora mensajes que no provienen de Meta', async () => {
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      // Origen que sólo *parece* de Meta.
      emitMetaMessage(
        {
          type: 'WA_EMBEDDED_SIGNUP',
          event: 'FINISH',
          data: { waba_id: 'waba-falso', phone_number_id: 'phone-falso' },
        },
        'https://notfacebook.com',
      );
      fb.cb!({ authResponse: { code: 'codigo-abc' } });
    });

    // El mensaje falso se descartó, así que no hay identificadores y no resuelve con datos.
    let settled = false;
    promise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  it('devuelve null y explica el motivo cuando el usuario cancela', async () => {
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      emitMetaMessage({
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'CANCEL',
        data: { current_step: 'PHONE_NUMBER_SELECTION' },
      });
      fb.cb!({ status: 'unknown' });
    });

    await expect(promise).resolves.toBeNull();
    await waitFor(() => {
      expect(result.current.error).toContain('PHONE_NUMBER_SELECTION');
    });
  });

  it('devuelve null y propaga el mensaje cuando Meta reporta un error', async () => {
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      emitMetaMessage({
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'ERROR',
        data: { error_message: 'El número ya está registrado' },
      });
      fb.cb!({ status: 'unknown' });
    });

    await expect(promise).resolves.toBeNull();
    await waitFor(() => {
      expect(result.current.error).toBe('El número ya está registrado');
    });
  });

  it('rechaza el alta que comparte la cuenta pero no un número', async () => {
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      emitMetaMessage({
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'FINISH_ONLY_WABA',
        data: { waba_id: 'waba-123' },
      });
      fb.cb!({ authResponse: { code: 'codigo-abc' } });
    });

    await expect(promise).resolves.toBeNull();
    await waitFor(() => {
      expect(result.current.error).toContain('número de teléfono');
    });
  });

  it('devuelve null si el usuario cierra la ventana sin autorizar', async () => {
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      fb.cb!({ status: 'unknown' });
    });

    await expect(promise).resolves.toBeNull();
  });

  it('no deja la promesa colgada si el código llega pero los datos nunca', async () => {
    vi.useFakeTimers();
    const fb = stubFbLogin();
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      fb.cb!({ authResponse: { code: 'codigo-abc' } });
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await expect(promise).resolves.toBeNull();
  });

  it('no deja escuchas de mensajes tras resolver', async () => {
    const fb = stubFbLogin();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { result } = renderHook(() => useFacebookSDK());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.launchEmbeddedSignup();
    });

    act(() => {
      emitMetaMessage({
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'FINISH',
        data: { waba_id: 'waba-123', phone_number_id: 'phone-456' },
      });
      fb.cb!({ authResponse: { code: 'codigo-abc' } });
    });

    await promise;
    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));
    removeSpy.mockRestore();
  });
});
