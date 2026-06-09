export function MetricasSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* 4 tarjetas de métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ backgroundColor: '#111916', border: '1px solid #2f3731' }}
          >
            <div className="h-2 w-16 rounded" style={{ backgroundColor: '#2f3731' }} />
            <div className="h-7 w-12 rounded" style={{ backgroundColor: '#2f3731' }} />
          </div>
        ))}
      </div>
      {/* Sección de lista */}
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ backgroundColor: '#111916', border: '1px solid #2f3731' }}
      >
        <div className="h-2 w-32 rounded" style={{ backgroundColor: '#2f3731' }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-4 rounded" style={{ backgroundColor: '#2f3731' }} />
            <div className="flex-1 h-2 rounded" style={{ backgroundColor: '#2f3731', width: `${70 - i * 10}%` }} />
            <div className="h-2 w-6 rounded" style={{ backgroundColor: '#2f3731' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
