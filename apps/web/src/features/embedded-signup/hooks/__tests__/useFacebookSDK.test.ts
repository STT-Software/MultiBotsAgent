import { renderHook, act } from '@testing-library/react';
import { useFacebookSDK } from '../useFacebookSDK';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useFacebookSDK', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, NEXT_PUBLIC_META_APP_ID: 'test-app-id', NEXT_PUBLIC_META_CONFIG_ID: 'test-config-id' };
    delete window.FB;
    delete (window as any).fbAsyncInit;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load SDK correctly', async () => {
    const { result } = renderHook(() => useFacebookSDK());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoaded).toBe(false);

    // Simulate SDK load
    act(() => {
      window.FB = { init: vi.fn(), login: vi.fn() };
      window.fbAsyncInit();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoaded).toBe(true);
  });

  it('should launch embedded signup and return data on success', async () => {
    window.FB = {
      init: vi.fn(),
      login: vi.fn((cb) => {
        cb({ authResponse: { code: 'test-code', waba_id: 'waba-1', phone_number_id: 'phone-1' } });
      }),
    };

    const { result } = renderHook(() => useFacebookSDK());
    
    let data;
    await act(async () => {
      data = await result.current.launchEmbeddedSignup();
    });

    expect(data).toEqual({ wabaId: 'waba-1', phoneNumberId: 'phone-1', tokenCode: 'test-code' });
    expect(window.FB.login).toHaveBeenCalled();
  });
});
