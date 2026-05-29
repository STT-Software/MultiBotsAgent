'use client'

import { useAgentesSummary } from '../hooks/use-agentes-summary'
import { NavCards } from './nav-cards'
import { QuickActions } from './quick-actions'
import { StatsError } from './stats-error'
import { StatsSkeleton } from './stats-skeleton'
import { StatsSummary } from './stats-summary'
import { OnboardingChecklist } from './onboarding-checklist'
import { RecentActivity } from './recent-activity'
import { MarketingFeatures } from './marketing-features'

export function DashboardView() {
  const { loading, error, data, retry } = useAgentesSummary()
  const totalAgents = data?.total ?? 0

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-[family-name:var(--font-geist-sans)] text-[32px] font-bold leading-[1.2] text-[#dde5dc] mb-1">
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

      {/* Guía de Configuración y Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="h-[432px] rounded-xl border border-gray-800/80 bg-gray-900/20 animate-pulse" />
          ) : (
            <OnboardingChecklist totalAgents={totalAgents} />
          )}
        </div>
        <div>
          {loading ? (
            <div className="h-[432px] rounded-xl border border-gray-800/80 bg-gray-900/20 animate-pulse" />
          ) : (
            <RecentActivity />
          )}
        </div>
      </div>

      {/* Sección de Marketing y Expansión */}
      <section aria-label="Funcionalidades Premium" className="border-t border-gray-800/50 pt-8">
        <MarketingFeatures />
      </section>
    </div>
  )
}

