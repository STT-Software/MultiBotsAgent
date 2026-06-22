'use client';

import { icons, AlertTriangle } from 'lucide-react';
import {
  IntegrationStatus,
  type IntegrationProvider,
  type IntegrationSummary,
} from '@multibotagents/types';
import type { CardState, ProviderCardView } from '../types';

interface IntegrationCardProps {
  view: ProviderCardView;
  /** El flujo OAuth de este proveedor se está iniciando. */
  isConnecting: boolean;
  /** La desconexión de esta integración está en curso. */
  isDisconnecting: boolean;
  /** Inicia (o reinicia) la conexión OAuth del proveedor. */
  onConnect: (provider: IntegrationProvider) => void;
  /** Solicita desconectar la integración (abre el diálogo de confirmación). */
  onDisconnect: (integration: IntegrationSummary) => void;
}

/**
 * Tarjeta de un proveedor de integración con su estado vivo y acciones
 * (SL13, slice 2).
 *
 * Combina el catálogo estático con la integración devuelta por `GET
 * /integrations` para mostrar el estado (conectado / requiere reconexión /
 * permisos insuficientes / no conectado), la cuenta vinculada y las acciones
 * Conectar / Reconectar / Desconectar (R7.1–R7.3, R6.1).
 */
export function IntegrationCard({
  view,
  isConnecting,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const { config, integration } = view;
  const Icon = icons[config.icon as keyof typeof icons];
  const state = deriveCardState(integration);

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
            <StatusBadge state={state} />
          </div>
          <p className="mt-1 text-sm text-[#bbcabe]">{config.description}</p>

          {state === 'connected' && integration?.accountDisplayName && (
            <p className="mt-2 text-xs text-[#8a948c]">
              Cuenta:{' '}
              <span className="text-[#bbcabe]">{integration.accountDisplayName}</span>
            </p>
          )}
        </div>
      </div>

      {(state === 'requires_reconnection' || state === 'insufficient_scopes') && (
        <ReconnectNotice state={state} />
      )}

      <div className="mt-5 flex justify-end gap-3">
        {integration && state !== 'not_connected' && (
          <button
            type="button"
            onClick={() => onDisconnect(integration)}
            disabled={isDisconnecting}
            className="rounded-lg border border-[#27272a] bg-transparent px-4 py-2 text-sm text-[#bbcabe] transition-colors hover:border-[#EF4444]/60 hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Desconectar
          </button>
        )}

        <button
          type="button"
          onClick={() => onConnect(config.provider)}
          disabled={isConnecting || isDisconnecting}
          className="inline-flex items-center gap-2 rounded-lg bg-[#00bb7a] px-4 py-2 text-sm font-bold text-[#004329] transition-colors hover:bg-[#00d488] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConnecting && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#004329] border-t-transparent" />
          )}
          {primaryActionLabel(state, isConnecting)}
        </button>
      </div>
    </div>
  );
}

// ─── Estado derivado ──────────────────────────────────────────────────────────

/** Traduce la integración viva (o su ausencia) al estado visual de la tarjeta. */
function deriveCardState(integration: IntegrationSummary | null): CardState {
  if (!integration || integration.status === IntegrationStatus.DISCONNECTED) {
    return 'not_connected';
  }
  if (integration.status === IntegrationStatus.REQUIRES_RECONNECTION) {
    return 'requires_reconnection';
  }
  if (integration.status === IntegrationStatus.INSUFFICIENT_SCOPES) {
    return 'insufficient_scopes';
  }
  return 'connected';
}

function primaryActionLabel(state: CardState, isConnecting: boolean): string {
  if (isConnecting) return 'Conectando…';
  if (state === 'not_connected') return 'Conectar';
  return 'Reconectar';
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusBadge({ state }: { state: CardState }) {
  if (state === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#49df9a]/20 bg-[#49df9a]/5 px-2.5 py-1 text-[11px] font-medium text-[#49df9a]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#49df9a]" />
        Conectado
      </span>
    );
  }

  if (state === 'requires_reconnection' || state === 'insufficient_scopes') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/5 px-2.5 py-1 text-[11px] font-medium text-[#F59E0B]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
        {state === 'requires_reconnection'
          ? 'Requiere reconexión'
          : 'Permisos insuficientes'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#27272a] bg-transparent px-2.5 py-1 text-[11px] font-medium text-[#8a948c]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#8a948c]" />
      No conectado
    </span>
  );
}

function ReconnectNotice({ state }: { state: CardState }) {
  const message =
    state === 'insufficient_scopes'
      ? 'Faltan permisos necesarios. Reconecta concediendo todos los accesos solicitados.'
      : 'La conexión expiró o fue revocada. Reconéctala para restaurar el acceso de tus agentes.';

  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/5 px-3 py-2 text-xs text-[#F59E0B]">
      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
