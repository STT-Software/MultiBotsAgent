import type { MetricasLiveState } from '../types/metricas.types';

interface MetricasLiveCountersProps {
  counters: MetricasLiveState['counters'];
}

const COUNTER_CONFIG = [
  { key: 'conversationsResolved' as const, label: 'Resueltas hoy',       color: '#00bb7a' },
  { key: 'conversationsActive'   as const, label: 'Activas ahora',        color: '#4ade80' },
  { key: 'escalationsOpen'       as const, label: 'Escalamientos abiertos', color: '#facc15' },
];

export function MetricasLiveCounters({ counters }: MetricasLiveCountersProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {COUNTER_CONFIG.map(({ key, label, color }) => (
        <div
          key={key}
          className="flex flex-col gap-1 rounded-xl p-4"
          style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}
        >
          <span className="text-xs uppercase tracking-wide" style={{ color: '#5a6b5e' }}>
            {label}
          </span>
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>
            {counters[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
