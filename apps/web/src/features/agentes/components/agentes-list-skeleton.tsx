export function AgentesListSkeleton() {
  return (
    <div className="w-full" role="status" aria-label="Cargando agentes">
      {/* Header skeleton */}
      <div
        className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3"
        style={{ backgroundColor: "#242c27" }}
      >
        <div className="h-3 w-16 rounded bg-[#242c27]" />
        <div className="h-3 w-12 rounded bg-[#242c27]" />
        <div className="h-3 w-14 rounded bg-[#242c27]" />
        <div className="h-3 w-16 rounded bg-[#242c27]" />
      </div>

      {/* Row skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-4 border-b"
          style={{ borderColor: "#3c4a41" }}
        >
          <div className="h-4 w-40 rounded bg-[#242c27] animate-pulse" />
          <div className="h-4 w-20 rounded bg-[#242c27] animate-pulse" />
          <div className="h-4 w-16 rounded bg-[#242c27] animate-pulse" />
          <div className="h-4 w-24 rounded bg-[#242c27] animate-pulse" />
        </div>
      ))}
    </div>
  );
}
