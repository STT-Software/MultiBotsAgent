import React from 'react';
import { ConnectWhatsAppButtonProps } from '../types';

export function ConnectWhatsAppButton({ onConnect, isLoading, disabled }: ConnectWhatsAppButtonProps) {
  return (
    <button
      onClick={onConnect}
      disabled={disabled || isLoading}
      className={`px-4 py-2 font-semibold text-white rounded-md transition-colors ${
        disabled || isLoading
          ? 'bg-blue-300 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {isLoading ? 'Conectando...' : 'Conectar WhatsApp'}
    </button>
  );
}
