import { renderHook, act } from '@testing-library/react';
import { useEmbeddedSignup } from '../useEmbeddedSignup';
import { EmbeddedSignupService } from '../../services/embedded-signup.service';
import * as useFacebookSDKModule from '../useFacebookSDK';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/embedded-signup.service');

describe('useEmbeddedSignup', () => {
  const mockLaunch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useFacebookSDKModule, 'useFacebookSDK').mockReturnValue({
      isLoaded: true,
      isLoading: false,
      error: null,
      launchEmbeddedSignup: mockLaunch,
    });
  });

  it('should connect successfully', async () => {
    mockLaunch.mockResolvedValue({ wabaId: 'waba-1', phoneNumberId: 'phone-1', tokenCode: 'code-1' });
    vi.mocked(EmbeddedSignupService.connectWhatsApp).mockResolvedValue({
      channelId: 'channel-1',
      status: 'connected',
      phoneNumberId: 'phone-1',
      displayName: 'Test Business',
    });

    const { result } = renderHook(() => useEmbeddedSignup('agent-1'));

    await act(async () => {
      await result.current.connect();
    });

    expect(EmbeddedSignupService.connectWhatsApp).toHaveBeenCalledWith({
      agentId: 'agent-1',
      wabaId: 'waba-1',
      phoneNumberId: 'phone-1',
      tokenCode: 'code-1',
    });

    expect(result.current.channelStatus).toBe('connected');
    expect(result.current.error).toBeNull();
  });

  it('should handle cancellation', async () => {
    mockLaunch.mockResolvedValue(null);

    const { result } = renderHook(() => useEmbeddedSignup('agent-1'));

    await act(async () => {
      await result.current.connect();
    });

    expect(EmbeddedSignupService.connectWhatsApp).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Conexión cancelada.');
  });
});
