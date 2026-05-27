import React from 'react';
import { EmbeddedSignupContainerProps } from './types';
import { useEmbeddedSignup } from './hooks/useEmbeddedSignup';
import { ConnectWhatsAppButton } from './components/ConnectWhatsAppButton';
import { ChannelStatusBadge } from './components/ChannelStatusBadge';
import { ReconnectBanner } from './components/ReconnectBanner';

export function EmbeddedSignupContainer({ agentId, currentChannel }: EmbeddedSignupContainerProps) {
  const {
    connect,
    disconnect,
    isConnecting,
    error,
    channelStatus,
    channelInfo,
  } = useEmbeddedSignup(agentId, currentChannel);

  const isConnected = channelStatus === 'connected' || channelStatus === 'partially_connected';
  const requiresReconnection = channelStatus === 'requires_reconnection';

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm mb-4">
          {error}
        </div>
      )}

      {requiresReconnection && (
        <ReconnectBanner onReconnect={connect} isLoading={isConnecting} />
      )}

      {isConnected ? (
        <div className="space-y-4">
          <ChannelStatusBadge 
            status={channelStatus!} 
            displayName={channelInfo?.displayName}
            phoneNumberId={channelInfo?.phoneNumberId}
          />
          <button
            onClick={disconnect}
            disabled={isConnecting}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            {isConnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
          </button>
        </div>
      ) : (
        <div>
          {!requiresReconnection && (
            <ConnectWhatsAppButton
              onConnect={connect}
              isLoading={isConnecting}
              disabled={isConnecting}
            />
          )}
        </div>
      )}
    </div>
  );
}
