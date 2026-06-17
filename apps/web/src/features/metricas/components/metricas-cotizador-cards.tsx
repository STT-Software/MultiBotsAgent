import type { AgentMetricsResponse } from '../types/metricas.types';
import { MetricasTopList } from './metricas-top-list';

interface MetricasCotizadorCardsProps {
  data: AgentMetricsResponse;
}

export function MetricasCotizadorCards({ data }: MetricasCotizadorCardsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tasa de éxito',      value: `${Math.round((data.successRate ?? 0) * 100)}%`,      color: '#00bb7a' },
          { label: 'Tasa de conversión', value: `${Math.round((data.conversionRate ?? 0) * 100)}%`,   color: '#4ade80' },
          { label: 'Pedidos confirmados', value: String(data.ordersConfirmed ?? 0),                   color: '#c8d8cc' },
          { label: 'Pedidos abandonados', value: String(data.ordersAbandoned ?? 0),                   color: '#f87171' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 flex flex-col gap-1" style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}>
            <span className="text-xs uppercase tracking-wide" style={{ color: '#5a6b5e' }}>{label}</span>
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {(data.topProducts?.length ?? 0) > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}>
          <MetricasTopList
            title="Productos más solicitados"
            items={(data.topProducts ?? []).map((p) => ({ label: p.productId, count: p.count }))}
          />
        </div>
      )}
    </div>
  );
}
