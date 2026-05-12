import { Bot, FileText, Users } from 'lucide-react'
import { type ReactNode } from 'react'

interface StatCardProps {
  value: number
  label: string
  icon: ReactNode
}

function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 flex flex-col justify-between h-[140px]">
      {/* Ícono decorativo de fondo */}
      <div className="absolute -right-2 -bottom-2 opacity-[0.06] text-[#dde5dc]">
        {icon}
      </div>

      <div>
        <h3 className="font-[family-name:var(--font-inter)] text-sm text-[#bbcabe] mb-1">
          {label}
        </h3>
        <span className="font-[family-name:var(--font-geist-sans)] text-[48px] font-bold leading-[1.1] tracking-[-0.02em] text-[#dde5dc]">
          {value}
        </span>
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
        icon={<Users className="h-[80px] w-[80px]" strokeWidth={1.5} />}
      />
      <StatCard
        value={activos}
        label="Agentes activos"
        icon={<Bot className="h-[80px] w-[80px]" strokeWidth={1.5} />}
      />
      <StatCard
        value={borradores}
        label="Agentes en borrador"
        icon={<FileText className="h-[80px] w-[80px]" strokeWidth={1.5} />}
      />
    </div>
  )
}
