function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 flex flex-col justify-between h-36">
      <div>
        <div className="mb-2 h-4 w-28 animate-pulse rounded bg-[#27272a]" />
        <div className="h-12 w-20 animate-pulse rounded bg-[#27272a]" />
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
