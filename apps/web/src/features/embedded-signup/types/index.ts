import { ChannelStatus, ChannelInfo, EmbeddedSignupCallbackData } from '@multibotagents/types';

export interface UseFacebookSDKReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  launchEmbeddedSignup: () => Promise<EmbeddedSignupCallbackData | null>;
}

export interface UseEmbeddedSignupReturn {
  connect: () => Promise<void>;
  connectManual: (wabaId: string, phoneNumberId: string, accessToken: string, pin?: string) => Promise<void>;
  simulateMessage: (messageText: string, senderPhoneNumber?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
  isSimulating: boolean;
  error: string | null;
  channelStatus: ChannelStatus | null;
  channelInfo: ChannelInfo | null;
  simulationResult: { success: boolean; messageId: string } | null;
}

export interface ConnectWhatsAppButtonProps {
  onConnect: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export interface ChannelStatusBadgeProps {
  status: ChannelStatus;
  displayName?: string;
  phoneNumberId?: string;
}

export interface ReconnectBannerProps {
  onReconnect: () => void;
  isLoading: boolean;
}

export interface EmbeddedSignupContainerProps {
  agentId: string;
  currentChannel?: ChannelInfo | null;
}
