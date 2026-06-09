interface PeakHourItem {
  hour: number;
  count: number;
}

interface MetricasPeakHoursProps {
  hours: PeakHourItem[];
}

export function MetricasPeakHours({ hours }: MetricasPeakHoursProps) {
  if (hours.length === 0) {
    return (
      <p className="text-xs" style={{ color: '#5a6b5e' }}>
        Sin citas en este período
      </p>
    );
  }

  const max = Math.max(...hours.map((h) => h.count));
  // Build a map for quick lookup
  const byHour = new Map(hours.map((h) => [h.hour, h.count]));

  return (
    <div>
      <p className="text-sm font-medium mb-3" style={{ color: '#869489' }}>Horarios pico</p>
      <div className="flex items-end gap-1" style={{ height: '64px' }}>
        {Array.from({ length: 24 }, (_, h) => {
          const count = byHour.get(h) ?? 0;
          const heightPct = max > 0 ? (count / max) * 100 : 0;
          return (
            <div key={h} className="flex flex-col items-center flex-1 gap-0.5">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.max(heightPct, count > 0 ? 8 : 2)}%`,
                  backgroundColor: count > 0 ? '#00bb7a' : '#2f3731',
                  minHeight: '2px',
                  maxHeight: '100%',
                }}
                title={count > 0 ? `${h}:00 — ${count} citas` : undefined}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: '#5a6b5e' }}>0h</span>
        <span className="text-xs" style={{ color: '#5a6b5e' }}>12h</span>
        <span className="text-xs" style={{ color: '#5a6b5e' }}>23h</span>
      </div>
    </div>
  );
}
