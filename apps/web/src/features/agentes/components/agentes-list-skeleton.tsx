export function AgentesListSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando agentes">
      {/* Metrics skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-lg border p-5"
            style={{ backgroundColor: "#1a211c", borderColor: "#3c4a41" }}
          >
            <div className="h-3 w-24 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
            <div className="h-8 w-16 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
            <div className="h-3 w-20 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div
        className="w-full overflow-hidden rounded-lg border"
        style={{ backgroundColor: "#1a211c", borderColor: "#3c4a41" }}
      >
        {/* Header */}
        <div
          className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3"
          style={{ borderBottom: "1px solid #3c4a41" }}
        >
          <div className="h-3 w-28 rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-3 w-16 rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-3 w-14 rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-3 w-24 rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-3 w-12 rounded" style={{ backgroundColor: "#242c27" }} />
        </div>

        {/* Row skeletons */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4"
            style={{ borderBottom: "1px solid #3c4a41" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 animate-pulse rounded-md"
                style={{ backgroundColor: "#242c27" }}
              />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-32 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
                <div className="h-3 w-20 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
              </div>
            </div>
            <div className="h-5 w-20 animate-pulse rounded-md" style={{ backgroundColor: "#242c27" }} />
            <div className="h-5 w-16 animate-pulse rounded-md" style={{ backgroundColor: "#242c27" }} />
            <div className="h-4 w-24 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
            <div className="h-4 w-4 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
