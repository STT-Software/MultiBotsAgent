function SkeletonCard() {
  return (
    <div className="rounded-lg border border-[#3c4a41] bg-[#242c27] p-6">
      <div className="mb-2 h-8 w-16 animate-pulse rounded bg-[#3c4a41]" />
      <div className="h-4 w-24 animate-pulse rounded bg-[#3c4a41]" />
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
