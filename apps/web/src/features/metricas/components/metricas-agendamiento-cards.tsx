import type { AgentMetricsResponse } from '../types/metricas.types';
import { MetricasPeakHours } from './metricas-peak-hours';

interface MetricasAgendamientoCardsProps {
  data: AgentMetricsResponse;
}

export function MetricasAgendamientoCards({ data }: MetricasAgendamientoCardsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tasa de éxito',    value: `${Math.round((data.successRate ?? 0) * 100)}%`, color: '#00bb7a' },
          { label: 'Citas agendadas',  value: String(data.appointmentsScheduled ?? 0),         color: '#c8d8cc' },
          { label: 'Citas canceladas', value: String(data.appointmentsCancelled ?? 0),         color: '#f87171' },
          { label: 'Reprogramadas',    value: String(data.appointmentsRescheduled ?? 0),       color: '#facc15' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 flex flex-col gap-1" style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}>
            <span className="text-xs uppercase tracking-wide" style={{ color: '#5a6b5e' }}>{label}</span>
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4" style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}>
        <MetricasPeakHours hours={data.peakHours ?? []} />
      </div>
    </div>
  );
}
