import React from 'react';
import { ChannelStatusBadgeProps } from '../types';

export function ChannelStatusBadge({ status, displayName, phoneNumberId }: ChannelStatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'partially_connected': return 'bg-yellow-100 text-yellow-800';
      case 'requires_reconnection': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'partially_connected': return 'Conectado Parcialmente';
      case 'requires_reconnection': return 'Requiere Reconexión';
      default: return 'Desconectado';
    }
  };

  return (
    <div className="border rounded-lg p-4 flex flex-col space-y-2 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Estado del Canal</h3>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      {displayName && (
        <div className="text-sm text-gray-600">
          <p><strong>Nombre:</strong> {displayName}</p>
        </div>
      )}
      {phoneNumberId && (
        <div className="text-sm text-gray-600">
          <p><strong>ID Número:</strong> {phoneNumberId}</p>
        </div>
      )}
    </div>
  );
}
