import type { MetricasLiveState } from '../types/metricas.types';
import { MetricasLiveCounters } from './metricas-live-counters';
import { MetricasActivityFeed } from './metricas-activity-feed';
import { MetricasLiveChart } from './metricas-live-chart';
import { MetricasTokensChart } from './metricas-tokens-chart';

interface MetricasLiveBlockProps {
  liveState: MetricasLiveState;
}

export function MetricasLiveBlock({ liveState }: MetricasLiveBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Banner de estado de conexión */}
      {liveState.status === 'reconnecting' && (
        <div
          className="rounded-lg px-4 py-2 text-sm flex items-center gap-2"
          style={{ backgroundColor: '#2d2500', border: '1px solid #facc15', color: '#facc15' }}
        >
          <span className="animate-pulse">●</span>
          Reconectando al servidor de métricas en vivo...
        </div>
      )}
      {liveState.status === 'error' && (
        <div
          className="rounded-lg px-4 py-2 text-sm"
          style={{ backgroundColor: '#2d0a0a', border: '1px solid #f87171', color: '#f87171' }}
        >
          No se pudo reconectar. Recarga la página para ver la actividad en vivo.
        </div>
      )}

      {/* Contadores */}
      <MetricasLiveCounters counters={liveState.counters} />

      {/* Gráficos en vivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricasLiveChart counters={liveState.counters} />
        <MetricasTokensChart counters={liveState.counters} />
      </div>

      {/* Feed de actividad */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}
      >
        <p className="text-xs uppercase tracking-wide mb-3" style={{ color: '#5a6b5e' }}>
          Actividad reciente
        </p>
        <MetricasActivityFeed items={liveState.feed} />
      </div>
    </div>
  );
}
