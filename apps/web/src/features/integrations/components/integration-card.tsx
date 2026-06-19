'use client';

import { icons } from 'lucide-react';
import type { IntegrationProvider } from '@multibotagents/types';
import type { ProviderCardConfig } from '../types';

interface IntegrationCardProps {
  config: ProviderCardConfig;
  /** El flujo OAuth de este proveedor se está iniciando. */
  isConnecting: boolean;
  /** El proveedor quedó conectado en esta sesión. */
  isConnected: boolean;
  onConnect: (provider: IntegrationProvider) => void;
}

/**
 * Tarjeta de un proveedor de integración con su acción de conexión (slice 1).
 *
 * Muestra "Conectar" por defecto y "Conectado" tras un retorno exitoso del
 * callback (estado efímero hasta el listado del slice 2).
 */
export function IntegrationCard({
  config,
  isConnecting,
  isConnected,
  onConnect,
}: IntegrationCardProps) {
  const Icon = icons[config.icon as keyof typeof icons];

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 transition-all duration-200 hover:border-[rgba(0,187,122,0.3)] hover:shadow-[inset_0_0_12px_rgba(0,187,122,0.04)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-[#27272a] bg-[#161616] text-[#49df9a]">
          {Icon && <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-[family-name:var(--font-inter)] text-base font-semibold text-[#dde5dc]">
              {config.name}
            </h3>
            {isConnected && <ConnectedBadge />}
          </div>
          <p className="mt-1 text-sm text-[#bbcabe]">{config.description}</p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => onConnect(config.provider)}
          disabled={isConnecting || isConnected}
          className="inline-flex items-center gap-2 rounded-lg bg-[#00bb7a] px-4 py-2 text-sm font-bold text-[#004329] transition-colors hover:bg-[#00d488] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConnecting && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#004329] border-t-transparent" />
          )}
          {connectButtonLabel(isConnecting, isConnected)}
        </button>
      </div>
    </div>
  );
}

function connectButtonLabel(isConnecting: boolean, isConnected: boolean): string {
  if (isConnected) return 'Conectado';
  if (isConnecting) return 'Conectando…';
  return 'Conectar';
}

function ConnectedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#49df9a]/20 bg-[#49df9a]/5 px-2.5 py-1 text-[11px] font-medium text-[#49df9a]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#49df9a]" />
      Conectado
    </span>
  );
}
