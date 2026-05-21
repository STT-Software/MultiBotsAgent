import { Bot, FileText, Users } from 'lucide-react'
import { type ReactNode } from 'react'

interface StatCardProps {
  value: number
  label: string
  subtitle: ReactNode
  icon: ReactNode
  staggerClass: string
}

function StatCard({ value, label, subtitle, icon, staggerClass }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#27272a] bg-[rgba(18,18,18,0.8)] backdrop-blur-[12px] p-6 flex flex-col justify-between h-[160px] transition-all duration-200 hover:border-[rgba(0,187,122,0.3)] hover:shadow-[inset_0_0_12px_rgba(0,187,122,0.04)] ${staggerClass}`}>
      {/* Ícono decorativo de fondo */}
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

      <div className="font-mono text-[11px] text-[#bbcabe]/60">
        {subtitle}
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
        subtitle="Últimos 30 días"
        icon={<Users className="h-[130px] w-[130px] text-[#dde5dc]" strokeWidth={2.5} />}
        staggerClass="stagger-1"
      />
      <StatCard
        value={activos}
        label="Agentes activos"
        subtitle={
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#49df9a] animate-pulse" />
            Operativos ahora
          </span>
        }
        icon={<Bot className="h-[130px] w-[130px] text-[#dde5dc]" strokeWidth={2.5} />}
        staggerClass="stagger-2"
      />
      <StatCard
        value={borradores}
        label="Agentes en borrador"
        subtitle={
          <div className="w-full">
            <div className="w-full bg-[#242c27] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-[#00bb7a] to-[#008855]"
                style={{ width: total > 0 ? `${((total - borradores) / total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        }
        icon={<FileText className="h-[130px] w-[130px] text-[#dde5dc]" strokeWidth={2.5} />}
        staggerClass="stagger-3"
      />
    </div>
  )
}
