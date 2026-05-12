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
    <div className="flex flex-col gap-8">
      <h1 className="font-[family-name:var(--font-geist-sans)] text-[32px] font-bold text-[#dde5dc]">
        Dashboard
      </h1>

      {/* Sección resumen de agentes */}
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

      {/* Sección acciones rápidas */}
      <section aria-label="Acciones rápidas">
        <QuickActions />
      </section>

      {/* Sección navegación */}
      <section aria-label="Navegación rápida">
        <NavCards />
      </section>
    </div>
  )
}
