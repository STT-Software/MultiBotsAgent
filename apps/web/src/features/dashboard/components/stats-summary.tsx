"use client";

import { Bot, FileText, Users } from 'lucide-react'
import { type ReactNode } from 'react'
import { motion } from 'motion/react'

interface StatCardProps {
  value: number
  label: string
  subtitle: ReactNode
  icon: ReactNode
  percentage?: number
  percentageType?: 'growth' | 'ratio'
}

function StatCard({ value, label, subtitle, icon, percentage, percentageType = 'growth' }: StatCardProps) {
  const isPercentageValid = percentage !== undefined && !isNaN(percentage)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, translateY: -2 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl border border-gray-800/80 bg-gray-900/40 backdrop-blur-md p-6 flex flex-col justify-between h-[160px] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 group cursor-pointer"
    >
      {/* Decorative background icon */}
      <div className="absolute -right-3 -bottom-3 opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
        {icon}
      </div>

      <div>
        <h3 className="font-[family-name:var(--font-inter)] text-sm text-gray-400 group-hover:text-gray-300 transition-colors mb-2">
          {label}
        </h3>
        <div className="flex items-baseline gap-3">
          <span className="font-[family-name:var(--font-geist-sans)] text-[48px] font-bold leading-[1.1] tracking-[-0.02em] text-white">
            {value}
          </span>
          {isPercentageValid && percentageType === 'growth' && (
            <span className={`font-mono text-xs flex items-center gap-1 ${percentage >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                {percentage >= 0 ? (
                  <path d="M1 9 C3 7, 5 10, 7 6 C8 4, 10 5, 11 3 M11 3 H7.5 M11 3 V6.5" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M1 3 C3 5, 5 2, 7 6 C8 8, 10 7, 11 9 M11 9 H7.5 M11 9 V5.5" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
              {percentage >= 0 ? '+' : ''}{percentage.toFixed(0)}%
            </span>
          )}
          {isPercentageValid && percentageType === 'ratio' && (
            <span className="font-mono text-[11px] text-gray-400 bg-gray-800/40 px-2 py-0.5 rounded border border-gray-800/50">
              {percentage.toFixed(0)}% del total
            </span>
          )}
        </div>
      </div>

      <div className="font-mono text-[11px] text-gray-500 group-hover:text-gray-400 transition-colors">
        {subtitle}
      </div>
    </motion.div>
  )
}

interface StatsSummaryProps {
  total: number
  activos: number
  borradores: number
  totalChangePct?: number
  activosPct?: number
  borradoresPct?: number
}

export function StatsSummary({
  total,
  activos,
  borradores,
  totalChangePct = 0,
  activosPct = 0,
  borradoresPct = 0,
}: StatsSummaryProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
    >
      <StatCard
        value={total}
        label="Total de agentes"
        subtitle="Últimos 30 días"
        percentage={totalChangePct}
        percentageType="growth"
        icon={<Users className="h-[130px] w-[130px] text-white" strokeWidth={2.5} />}
      />
      <StatCard
        value={activos}
        label="Agentes activos"
        subtitle={
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Operativos ahora
          </span>
        }
        percentage={activosPct}
        percentageType="ratio"
        icon={<Bot className="h-[130px] w-[130px] text-white" strokeWidth={2.5} />}
      />
      <StatCard
        value={borradores}
        label="Agentes en borrador"
        subtitle={
          <div className="w-full">
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: total > 0 ? `${((total - borradores) / total) * 100}%` : '0%' }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              />
            </div>
          </div>
        }
        percentage={borradoresPct}
        percentageType="ratio"
        icon={<FileText className="h-[130px] w-[130px] text-white" strokeWidth={2.5} />}
      />
    </motion.div>
  )
}
