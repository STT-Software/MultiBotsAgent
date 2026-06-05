import React from 'react';
import { ReconnectBannerProps } from '../types';

export function ReconnectBanner({ onReconnect, isLoading }: ReconnectBannerProps) {
  return (
    <div 
      className="rounded-xl border p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 relative overflow-hidden"
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        borderColor: "rgba(239, 68, 68, 0.25)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 15px rgba(239, 68, 68, 0.05)"
      }}
    >
      <div 
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: "#ef4444" }}
      />
      <div className="flex gap-3 items-start pl-2">
        <span className="text-xl mt-0.5 animate-pulse text-[#ef4444]">⚠️</span>
        <div>
          <h3 className="text-sm font-bold" style={{ fontFamily: 'Geist, Inter, sans-serif', color: '#ff8484' }}>
            Tu canal requiere reconexión
          </h3>
          <p className="mt-1 text-xs text-[#869489] leading-relaxed">
            El token de acceso de WhatsApp ha expirado o es inválido. Por favor, vuelve a conectar el número.
          </p>
        </div>
      </div>
      <button
        onClick={onReconnect}
        disabled={isLoading}
        className="px-4 py-2 border text-xs font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] self-stretch sm:self-auto text-center"
        style={{
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          borderColor: "rgba(239, 68, 68, 0.4)",
          color: "#ff8484",
        }}
      >
        {isLoading ? 'Reconectando...' : 'Reconectar'}
      </button>
    </div>
  );
}

