export function MetricasMock() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
      {/* Line chart mock */}
      <div
        className="flex flex-col gap-3 rounded-xl p-5"
        style={{ backgroundColor: "#111916", border: "1px solid #3c4a41" }}
      >
        {/* Skeleton header */}
        <div className="flex items-center justify-between">
          <div className="h-2 w-20 rounded" style={{ backgroundColor: "#2f3731" }} />
          <div className="h-2 w-10 rounded" style={{ backgroundColor: "#2f3731" }} />
        </div>
        {/* Line chart SVG */}
        <div className="flex-1 flex items-end" style={{ height: "100px" }}>
          <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
            <polyline
              points="0,70 30,60 60,50 90,55 120,35 150,30 180,20 200,25"
              fill="none"
              stroke="#00bb7a"
              strokeWidth="2"
              opacity="0.7"
            />
            <polyline
              points="0,70 30,60 60,50 90,55 120,35 150,30 180,20 200,25"
              fill="url(#lineGradient)"
              stroke="none"
            />
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00bb7a" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#00bb7a" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Bar chart mock */}
      <div
        className="flex flex-col gap-3 rounded-xl p-5"
        style={{ backgroundColor: "#111916", border: "1px solid #3c4a41" }}
      >
        {/* Skeleton header */}
        <div className="flex items-center justify-between">
          <div className="h-2 w-24 rounded" style={{ backgroundColor: "#2f3731" }} />
          <div className="h-2 w-8 rounded" style={{ backgroundColor: "#2f3731" }} />
        </div>
        {/* Bars */}
        <div className="flex items-end justify-between gap-1.5 flex-1" style={{ height: "100px" }}>
          {[45, 70, 55, 85, 60, 90, 40, 75, 50].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                backgroundColor: i % 2 === 0 ? "#00bb7a" : "#1a3d2f",
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      </div>

      {/* Gauge/donut mock */}
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl p-5"
        style={{ backgroundColor: "#111916", border: "1px solid #3c4a41" }}
      >
        {/* Skeleton header */}
        <div className="h-2 w-16 rounded self-start" style={{ backgroundColor: "#2f3731" }} />
        {/* Gauge */}
        <div className="relative flex items-center justify-center" style={{ width: "90px", height: "90px" }}>
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#2f3731"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#00bb7a"
              strokeWidth="8"
              strokeDasharray="251.2"
              strokeDashoffset="62.8"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[9px] font-mono uppercase" style={{ color: "#5a6b5e" }}>
              --:--
            </span>
            <span className="text-[10px] font-bold uppercase" style={{ color: "#869489" }}>
              Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
