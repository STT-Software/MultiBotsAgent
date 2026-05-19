export function AgenteDetalleSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando detalle del agente">
      {/* Tabs skeleton */}
      <div className="flex gap-1" style={{ borderBottom: "1px solid #3c4a41" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-28 animate-pulse rounded-t-md"
            style={{ backgroundColor: "#242c27" }}
          />
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="flex flex-col gap-5 max-w-lg">
        {/* Label + badge */}
        <div className="flex flex-col gap-2">
          <div className="h-3 w-12 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-6 w-20 animate-pulse rounded-md" style={{ backgroundColor: "#242c27" }} />
        </div>

        {/* Label + input */}
        <div className="flex flex-col gap-2">
          <div className="h-3 w-28 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="h-10 w-full animate-pulse rounded-lg" style={{ backgroundColor: "#242c27" }} />
        </div>

        {/* Label + selector cards */}
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 animate-pulse rounded" style={{ backgroundColor: "#242c27" }} />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-full animate-pulse rounded-lg"
                style={{ backgroundColor: "#242c27" }}
              />
            ))}
          </div>
        </div>

        {/* Button */}
        <div className="h-10 w-36 animate-pulse rounded-lg" style={{ backgroundColor: "#242c27" }} />
      </div>
    </div>
  );
}
