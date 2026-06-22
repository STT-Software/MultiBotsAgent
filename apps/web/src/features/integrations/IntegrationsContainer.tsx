'use client';

import { useMemo, useState } from 'react';
import { Plug, AlertTriangle } from 'lucide-react';
import type { IntegrationSummary } from '@multibotagents/types';
import { Toast } from '@/components/ui';
import { IntegrationCard, DisconnectDialog } from './components';
import { useIntegrationConnection, useIntegrations } from './hooks';
import { PROVIDER_CARDS, CATEGORY_LABELS } from './constants';
import type { ProviderCardView } from './types';

/**
 * Sección de Integraciones Externas del panel (SL13, slices 1-2).
 *
 * Lista los proveedores soportados agrupados por categoría con su estado vivo
 * (`GET /integrations`), permite conectar/reconectar vía OAuth y desconectar
 * con confirmación (`DELETE /integrations/:id`).
 */
export default function IntegrationsContainer() {
  const {
    connectingProvider,
    feedback: connectFeedback,
    connect,
    dismissFeedback: dismissConnectFeedback,
  } = useIntegrationConnection();

  const {
    integrations,
    isLoading,
    loadError,
    disconnectingId,
    feedback: listFeedback,
    disconnect,
    dismissFeedback: dismissListFeedback,
  } = useIntegrations();

  const [toDisconnect, setToDisconnect] = useState<IntegrationSummary | null>(null);

  // Integración viva por proveedor (única por `{companyId, provider}`).
  const integrationByProvider = useMemo(() => {
    const map = new Map<string, IntegrationSummary>();
    for (const integration of integrations) {
      map.set(integration.provider, integration);
    }
    return map;
  }, [integrations]);

  const handleConfirmDisconnect = async () => {
    if (!toDisconnect) return;
    await disconnect(toDisconnect.id);
    setToDisconnect(null);
  };

  const disconnectProviderName = toDisconnect
    ? PROVIDER_CARDS.find((card) => card.provider === toDisconnect.provider)?.name ??
      'la integración'
    : null;

  return (
    <div className="flex flex-col gap-6">
      <Header />

      {connectFeedback && (
        <Toast
          message={connectFeedback.message}
          variant={connectFeedback.variant}
          onDismiss={dismissConnectFeedback}
        />
      )}
      {listFeedback && (
        <Toast
          message={listFeedback.message}
          variant={listFeedback.variant}
          onDismiss={dismissListFeedback}
        />
      )}

      {loadError ? (
        <LoadError />
      ) : isLoading ? (
        <LoadingState />
      ) : (
        CATEGORY_LABELS.map(({ category, label }) => {
          const cards = PROVIDER_CARDS.filter((card) => card.category === category);
          if (cards.length === 0) return null;

          return (
            <section key={category} className="flex flex-col gap-4">
              <h2 className="font-[family-name:var(--font-inter)] text-sm font-semibold uppercase tracking-wide text-[#8a948c]">
                {label}
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {cards.map((config) => {
                  const integration =
                    integrationByProvider.get(config.provider) ?? null;
                  const view: ProviderCardView = { config, integration };
                  return (
                    <IntegrationCard
                      key={config.provider}
                      view={view}
                      isConnecting={connectingProvider === config.provider}
                      isDisconnecting={
                        integration !== null && disconnectingId === integration.id
                      }
                      onConnect={connect}
                      onDisconnect={setToDisconnect}
                    />
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <DisconnectDialog
        isOpen={toDisconnect !== null}
        providerName={disconnectProviderName}
        accountName={toDisconnect?.accountDisplayName}
        isDisconnecting={
          toDisconnect !== null && disconnectingId === toDisconnect.id
        }
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setToDisconnect(null)}
      />
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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

function LoadingState() {
  return (
    <p className="text-sm text-[#8a948c]">Cargando integraciones…</p>
  );
}

function LoadError() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/5 px-4 py-3 text-sm text-[#EF4444]">
      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>
        No se pudieron cargar tus integraciones. Recarga la página para intentar de
        nuevo.
      </span>
    </div>
  );
}
