import React from 'react';
import { ReconnectBannerProps } from '../types';

export function ReconnectBanner({ onReconnect, isLoading }: ReconnectBannerProps) {
  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-4 flex justify-between items-center">
      <div>
        <h3 className="text-sm font-medium text-red-800">Tu canal requiere reconexión</h3>
        <p className="mt-1 text-sm text-red-700">
          El token de acceso de WhatsApp ha expirado o es inválido. Por favor, vuelve a conectar el número.
        </p>
      </div>
      <button
        onClick={onReconnect}
        disabled={isLoading}
        className="ml-4 px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        {isLoading ? 'Reconectando...' : 'Reconectar'}
      </button>
    </div>
  );
}
