import type { AgentMetricsResponse } from '../types/metricas.types';
import { MetricasTopList } from './metricas-top-list';

interface MetricasRagCardsProps {
  data: AgentMetricsResponse;
}

export function MetricasRagCards({ data }: MetricasRagCardsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 flex flex-col gap-1" style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}>
          <span className="text-xs uppercase tracking-wide" style={{ color: '#5a6b5e' }}>Tasa de éxito</span>
          <span className="text-2xl font-bold" style={{ color: '#00bb7a' }}>
            {Math.round((data.successRate ?? 0) * 100)}%
          </span>
        </div>
        <div className="rounded-xl p-4 flex flex-col gap-1" style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}>
          <span className="text-xs uppercase tracking-wide" style={{ color: '#5a6b5e' }}>Sin respuesta</span>
          <span className="text-2xl font-bold tabular-nums" style={{ color: '#facc15' }}>
            {data.noAnswerCount ?? 0}
          </span>
        </div>
      </div>

      {(data.topTopics?.length ?? 0) > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}>
          <MetricasTopList
            title="Temas más consultados"
            items={(data.topTopics ?? []).map((t) => ({ label: t.topic, count: t.count }))}
          />
        </div>
      )}
    </div>
  );
}
