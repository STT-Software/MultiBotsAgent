import { Bot, FileText, Users } from 'lucide-react'
import { type ReactNode } from 'react'

interface StatCardProps {
  value: number
  label: string
  subtitle: string
  icon: ReactNode
}

function StatCard({ value, label, subtitle, icon }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 flex flex-col justify-between h-[160px]">
      {/* Ícono decorativo de fondo — grande y grueso como en la referencia */}
      <div className="absolute -right-3 -bottom-3 opacity-[0.08]">
        {icon}
      </div>

      <div>
        <h3 className="font-[family-name:var(--font-inter)] text-sm text-[#bbcabe] mb-2">
          {label}
        </h3>
        <div className="flex items-baseline gap-3">
          <span className="font-[family-name:var(--font-geist-sans)] text-[48px] font-bold leading-[1.1] tracking-[-0.02em] text-[#dde5dc]">
            {value}
          </span>
          <span className="font-mono text-xs text-[#49df9a] flex items-center gap-1">
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 8 C3 6, 5 9, 7 5 C8 3, 10 4, 11 2" strokeLinecap="round" />
            </svg>
            +12%
          </span>
        </div>
      </div>

      <p className="font-mono text-[11px] text-[#bbcabe]/60">
        {subtitle}
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard
        value={total}
        label="Total de agentes"
        subtitle="Últimos 30 días"
        icon={<Users className="h-[130px] w-[130px] text-[#dde5dc]" strokeWidth={2.5} />}
      />
      <StatCard
        value={activos}
        label="Agentes activos"
        subtitle="Operativos ahora"
        icon={<Bot className="h-[130px] w-[130px] text-[#dde5dc]" strokeWidth={2.5} />}
      />
      <StatCard
        value={borradores}
        label="Agentes en borrador"
        subtitle="En configuración"
        icon={<FileText className="h-[130px] w-[130px] text-[#dde5dc]" strokeWidth={2.5} />}
      />
    </div>
  )
}
