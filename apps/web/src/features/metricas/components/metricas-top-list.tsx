interface TopListItem {
  label: string;
  count: number;
}

interface MetricasTopListProps {
  items: TopListItem[];
  title: string;
}

export function MetricasTopList({ items, title }: MetricasTopListProps) {
  if (items.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: '#869489' }}>{title}</p>
        <p className="text-xs" style={{ color: '#5a6b5e' }}>Sin datos disponibles</p>
      </div>
    );
  }

  const max = Math.max(...items.map((i) => i.count));

  return (
    <div>
      <p className="text-sm font-medium mb-3" style={{ color: '#869489' }}>{title}</p>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => {
          const pct = max > 0 ? (item.count / max) * 100 : 0;
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs w-4 text-right shrink-0" style={{ color: '#5a6b5e' }}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs truncate" style={{ color: '#c8d8cc' }}>
                    {item.label}
                  </span>
                  <span className="text-xs ml-2 shrink-0" style={{ color: '#5a6b5e' }}>
                    {item.count}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#2f3731' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: '#00bb7a' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
