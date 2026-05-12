import { Bot, FileText, Users } from 'lucide-react'
import { type ReactNode } from 'react'

interface StatCardProps {
  value: number
  label: string
  icon: ReactNode
}

function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 flex flex-col justify-between h-36">
      {/* Ícono decorativo de fondo */}
      <div className="absolute -right-4 -bottom-4 opacity-5 text-[#dde5dc]">
        <span className="text-[120px] leading-none">{icon}</span>
      </div>

      <div>
        <h3 className="font-[family-name:var(--font-inter)] text-sm text-[#bbcabe] mb-1">
          {label}
        </h3>
        <div className="flex items-baseline gap-3">
          <span className="font-[family-name:var(--font-geist-sans)] text-[48px] font-bold leading-[1.1] tracking-[-0.02em] text-[#dde5dc]">
            {value}
          </span>
        </div>
      </div>
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard
        value={total}
        label="Total de agentes"
        icon={<Users className="h-[120px] w-[120px]" strokeWidth={1} />}
      />
      <StatCard
        value={activos}
        label="Agentes activos"
        icon={<Bot className="h-[120px] w-[120px]" strokeWidth={1} />}
      />
      <StatCard
        value={borradores}
        label="Agentes en borrador"
        icon={<FileText className="h-[120px] w-[120px]" strokeWidth={1} />}
      />
    </div>
  )
}
