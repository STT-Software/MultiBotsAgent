export function InboxSkeleton() {
  return (
    <div className="flex h-full" role="status" aria-label="Cargando inbox">
      {/* List skeleton */}
      <div
        className="flex w-[350px] shrink-0 flex-col"
        style={{ borderRight: "1px solid #3c4a41" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #3c4a41" }}>
          <div className="h-4 w-40 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-5 w-5 animate-pulse rounded-full" style={{ backgroundColor: "#242c27" }} />
        </div>

        {/* Items */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3.5"
            style={{ borderBottom: "1px solid #3c4a41" }}
          >
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full" style={{ backgroundColor: "#242c27" }} />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-3 w-32 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
              <div className="h-3 w-20 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
              <div className="h-4 w-28 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
              <div className="h-3 w-full animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Detail skeleton */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-3">
          <div className="h-5 w-48 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-4 w-32 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-4 w-64 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
        </div>
        <div className="flex-1 flex flex-col gap-3 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`h-14 w-3/5 animate-pulse rounded-lg ${i % 2 === 0 ? "" : "self-end"}`}
              style={{ backgroundColor: "#242c27" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
