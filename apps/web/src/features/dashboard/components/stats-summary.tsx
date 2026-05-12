interface StatCardProps {
  value: number
  label: string
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="rounded-lg border border-[#3c4a41] bg-[#242c27] p-6">
      <p className="font-[family-name:var(--font-geist-sans)] text-[32px] font-bold text-[#dde5dc]">
        {value}
      </p>
      <p className="font-[family-name:var(--font-inter)] text-sm text-[#bbcabe]">
        {label}
      </p>
    </div>
  )
}

interface StatsSummaryProps {
  total: number
  activos: number
  borradores: number
}

export function StatsSummary({ total, activos, borradores }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard value={total} label="Total de agentes" />
      <StatCard value={activos} label="Agentes activos" />
      <StatCard value={borradores} label="Agentes en borrador" />
    </div>
  )
}
