import type { FeedItem } from '../types/metricas.types';
import { MetricasActivityItem } from './metricas-activity-item';

interface MetricasActivityFeedProps {
  items: FeedItem[];
}

export function MetricasActivityFeed({ items }: MetricasActivityFeedProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: '#5a6b5e' }}>
        Sin actividad reciente
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y" style={{ borderColor: '#2f3731' }}>
      {items.map((item) => (
        <MetricasActivityItem key={item.id} item={item} />
      ))}
    </div>
  );
}
