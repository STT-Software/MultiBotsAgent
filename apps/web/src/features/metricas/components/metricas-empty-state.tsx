import { BarChart3 } from 'lucide-react';

export function MetricasEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <BarChart3 size={32} style={{ color: '#3c4a41' }} aria-hidden="true" />
      <p className="text-sm" style={{ color: '#5a6b5e' }}>
        Sin actividad en este período
      </p>
    </div>
  );
}
