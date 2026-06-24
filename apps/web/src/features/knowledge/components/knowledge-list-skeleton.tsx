/**
 * Esqueletos de carga para la tabla de fuentes.
 */
export function KnowledgeListSkeleton() {
  return (
    <div className="overflow-hidden rounded border border-[#262626] bg-[#0F0F0F]">
      {/* Header */}
      <div className="flex border-b border-[#262626] px-4 py-2.5">
        {[120, 60, 60, 80, 60, 70, 50].map((w, i) => (
          <div key={i} className="px-2">
            <div className="h-3 animate-pulse rounded bg-[#262626]" style={{ width: w }} />
          </div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center border-b border-[#262626] px-4 py-3 last:border-b-0">
          <div className="flex-1 px-2"><div className="h-4 w-32 animate-pulse rounded bg-[#1a1a1a]" /></div>
          <div className="px-2"><div className="h-4 w-10 animate-pulse rounded bg-[#1a1a1a]" /></div>
          <div className="px-2"><div className="h-4 w-14 animate-pulse rounded bg-[#1a1a1a]" /></div>
          <div className="px-2"><div className="h-4 w-20 animate-pulse rounded bg-[#1a1a1a]" /></div>
          <div className="px-2"><div className="h-4 w-8 animate-pulse rounded bg-[#1a1a1a]" /></div>
          <div className="px-2"><div className="h-4 w-16 animate-pulse rounded bg-[#1a1a1a]" /></div>
          <div className="px-2"><div className="h-4 w-12 animate-pulse rounded bg-[#1a1a1a]" /></div>
        </div>
      ))}
    </div>
  );
}
