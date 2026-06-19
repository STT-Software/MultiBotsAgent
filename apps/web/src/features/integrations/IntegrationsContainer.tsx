'use client';

import { Plug } from 'lucide-react';
import { Toast } from '@/components/ui';
import { IntegrationCard } from './components';
import { useIntegrationConnection } from './hooks';
import { PROVIDER_CARDS } from './constants';

/**
 * Sección de Integraciones Externas del panel (SL13, slice 1).
 *
 * Lista los proveedores conectables (solo Google Drive en este slice), permite
 * iniciar la conexión OAuth y muestra el resultado del retorno del callback.
 */
export default function IntegrationsContainer() {
  const { connectingProvider, connectedProvider, feedback, connect, dismissFeedback } =
    useIntegrationConnection();

  return (
    <div className="flex flex-col gap-6">
      <Header />

      {feedback && (
        <Toast
          message={feedback.message}
          variant={feedback.variant}
          onDismiss={dismissFeedback}
        />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {PROVIDER_CARDS.map((config) => (
          <IntegrationCard
            key={config.provider}
            config={config}
            isConnecting={connectingProvider === config.provider}
            isConnected={connectedProvider === config.provider}
            onConnect={connect}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Header() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] text-[#49df9a]">
        <Plug className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </div>
      <div>
        <h1 className="font-[family-name:var(--font-geist-sans)] text-[28px] font-bold leading-[1.2] text-[#dde5dc]">
          Integraciones
        </h1>
        <p className="font-[family-name:var(--font-inter)] text-sm text-[#bbcabe]">
          Conecta servicios externos para que tus agentes accedan a tus fuentes.
        </p>
      </div>
    </div>
  );
}
