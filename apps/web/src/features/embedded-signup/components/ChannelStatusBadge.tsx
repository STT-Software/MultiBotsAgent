import React from 'react';
import { ChannelStatus } from '@multibotagents/types';

interface ChannelStatusBadgeProps {
  status: ChannelStatus;
  displayName?: string;
  phoneNumberId?: string;
  telegramBotUsername?: string;
  provider?: 'whatsapp' | 'telegram';
}

const WhatsAppIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.848.502 3.578 1.377 5.071L2 22l5.09-1.33c1.433.784 3.064 1.233 4.795 1.233 5.524 0 10.115-4.479 10.115-10.003C22 6.48 17.524 2 12.004 2zm6.657 13.918c-.249.663-1.442 1.23-2.02 1.38-.524.137-1.185.172-1.902-.06-3.05-1.272-5.042-4.344-5.19-4.542-.15-.198-1.24-1.647-1.24-3.146 0-1.498.786-2.24 1.066-2.54.279-.3.61-.376.812-.376.203 0 .408.002.586.01.185.01.448-.09.69.51.247.595.918 2.23.993 2.38.075.149.124.322.025.52-.099.199-.149.323-.298.497-.149.173-.312.387-.446.52-.149.148-.303.309-.13.606.173.298.77 1.271 1.653 2.059 1.135 1.012 2.093 1.325 2.39 1.475.298.149.471.124.645-.075.173-.198.743-.867.94-1.164.199-.298.397-.249.671-.15.277.1.1.2.378.3.272.099 1.782.818 2.03.967.249.149.414.223.473.34.059.12.059.687-.19 1.35z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.66-.52.36-1 .54-1.42.53-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.36-.49 1.01-.74 3.96-1.72 6.6-2.86 7.92-3.41 3.77-1.57 4.55-1.84 5.06-1.85.11 0 .36.03.52.16.14.12.18.28.2.4.02.07.03.21.01.3z" />
  </svg>
);

export function ChannelStatusBadge({
  status,
  displayName,
  phoneNumberId,
  telegramBotUsername,
  provider = 'whatsapp',
}: ChannelStatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'connected':
        return {
          bg: 'rgba(0, 187, 122, 0.1)',
          border: '1px solid rgba(0, 187, 122, 0.3)',
          text: '#00bb7a',
          label: 'Conectado',
        };
      case 'partially_connected':
        return {
          bg: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          text: '#eab308',
          label: 'Parcial',
        };
      case 'requires_reconnection':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          text: '#ef4444',
          label: 'Reconexión requerida',
        };
      default:
        return {
          bg: 'rgba(134, 148, 137, 0.1)',
          border: '1px solid rgba(134, 148, 137, 0.3)',
          text: '#869489',
          label: 'Desconectado',
        };
    }
  };

  const config = getStatusStyles();
  const isTelegram = provider === 'telegram';

  return (
    <div
      className="rounded-xl p-6 border transition-all duration-300 relative overflow-hidden flex flex-col gap-4 group"
      style={{
        background: isTelegram 
          ? 'radial-gradient(circle at top right, rgba(56, 189, 248, 0.06), rgba(26, 33, 28, 0.5) 70%)'
          : 'radial-gradient(circle at top right, rgba(0, 187, 122, 0.06), rgba(26, 33, 28, 0.5) 70%)',
        borderColor: '#3c4a41',
        backdropFilter: 'blur(8px)',
        boxShadow: isTelegram 
          ? '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(56, 189, 248, 0.03)'
          : '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(0, 187, 122, 0.03)',
      }}
    >
      {/* Top indicator glow */}
      <div
        className="absolute top-0 left-0 w-full h-[3px] transition-all duration-300"
        style={{
          backgroundColor: config.text,
          opacity: 0.8,
          boxShadow: `0 2px 8px ${config.text}`,
        }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105"
            style={{
              backgroundColor: isTelegram ? 'rgba(56, 189, 248, 0.12)' : 'rgba(0, 187, 122, 0.12)',
              border: isTelegram ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(0, 187, 122, 0.35)',
              color: isTelegram ? '#38bdf8' : '#00bb7a',
              boxShadow: isTelegram ? '0 0 12px rgba(56, 189, 248, 0.1)' : '0 0 12px rgba(0, 187, 122, 0.1)',
            }}
          >
            {isTelegram ? <TelegramIcon className="w-5 h-5" /> : <WhatsAppIcon className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#dde5dc] uppercase tracking-wider" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>
              Canal de {isTelegram ? 'Telegram' : 'WhatsApp'}
            </h3>
            <p className="text-xs" style={{ color: '#869489' }}>
              {isTelegram ? 'Integración oficial vía Bot API' : 'Integración oficial de Meta'}
            </p>
          </div>
        </div>

        <span
          className="px-3 py-1 rounded-full text-xs font-bold transition-all"
          style={{
            backgroundColor: config.bg,
            border: config.border,
            color: config.text,
          }}
        >
          {config.label}
        </span>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t"
        style={{ borderColor: 'rgba(60, 74, 65, 0.3)' }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#869489]">
            Nombre del Canal
          </span>
          <span className="text-sm font-bold text-[#dde5dc]">
            {displayName || (isTelegram ? 'Bot de Telegram' : 'Número WhatsApp')}
          </span>
        </div>

        {isTelegram ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#869489]">
              Bot Username
            </span>
            <span className="text-sm font-mono font-semibold" style={{ color: '#38bdf8' }}>
              @{telegramBotUsername || 'desconocido_bot'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#869489]">
              Phone Number ID
            </span>
            <span className="text-sm font-mono text-[#dde5dc]">
              {phoneNumberId || 'Sin ID'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
