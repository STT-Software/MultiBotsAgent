'use client'

import { useAgentesSummary } from '../hooks/use-agentes-summary'
import { NavCards } from './nav-cards'
import { QuickActions } from './quick-actions'
import { StatsError } from './stats-error'
import { StatsSkeleton } from './stats-skeleton'
import { StatsSummary } from './stats-summary'

export function DashboardView() {
  const { loading, error, data, retry } = useAgentesSummary()

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-[family-name:var(--font-geist-sans)] text-[32px] font-semibold leading-[1.2] text-[#dde5dc] mb-1">
            Panel de Control
          </h1>
          <p className="font-[family-name:var(--font-inter)] text-base text-[#bbcabe]">
            Resumen en tiempo real de tus agentes.
          </p>
        </div>
        <QuickActions />
      </div>

      {/* KPI Cards */}
      <section aria-label="Resumen de agentes">
        {loading && <StatsSkeleton />}
        {error && <StatsError onRetry={retry} />}
        {data && (
          <StatsSummary
            total={data.total}
            activos={data.activos}
            borradores={data.borradores}
          />
        )}
      </section>

      {/* Navegación rápida */}
      <section aria-label="Navegación rápida">
        <NavCards />
      </section>
    </div>
  )
}
