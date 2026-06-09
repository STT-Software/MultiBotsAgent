import type { GeneralMetricsResponse } from '../types/metricas.types';
import { MetricasTopList } from './metricas-top-list';

interface MetricasGeneralesCardsProps {
  data: GeneralMetricsResponse;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: '#5a6b5e' }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums" style={{ color: '#c8d8cc' }}>{value}</span>
    </div>
  );
}

export function MetricasGeneralesCards({ data }: MetricasGeneralesCardsProps) {
  const isEmpty =
    data.totalConversations === 0 &&
    data.totalEscalations === 0 &&
    data.topTopics.length === 0 &&
    data.avgEscalationResolutionMinutes === 0;

  if (isEmpty) return null; // MetricasHistoricoBlock muestra EmptyState

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Conversaciones" value={String(data.totalConversations)} />
        <MetricCard label="Tasa de resolución" value={`${Math.round(data.resolutionRate * 100)}%`} />
        <MetricCard label="Escalamientos" value={String(data.totalEscalations)} />
        <MetricCard label="Tasa escalamiento" value={`${Math.round(data.escalationRate * 100)}%`} />
      </div>

      {data.topTopics.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}
        >
          <MetricasTopList
            title="Temas más consultados (RAG)"
            items={data.topTopics.map((t) => ({ label: t.topic, count: t.count }))}
          />
        </div>
      )}

      {data.avgEscalationResolutionMinutes > 0 && (
        <div
          className="rounded-xl p-4 flex flex-col gap-1"
          style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}
        >
          <span className="text-xs uppercase tracking-wide" style={{ color: '#5a6b5e' }}>
            Tiempo promedio resolución escalamiento
          </span>
          <span className="text-2xl font-bold tabular-nums" style={{ color: '#c8d8cc' }}>
            {Math.round(data.avgEscalationResolutionMinutes)} min
          </span>
        </div>
      )}
    </div>
  );
}
