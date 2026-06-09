'use client';

import type { AgentTypeFilter, MetricPeriod } from '../types/metricas.types';
import { useMetricasGenerales } from '../hooks/use-metricas-generales';
import { useMetricasPorTipo } from '../hooks/use-metricas-por-tipo';
import { MetricasPeriodSelector } from './metricas-period-selector';
import { MetricasAgentSelector } from './metricas-agent-selector';
import { MetricasGeneralesCards } from './metricas-generales-cards';
import { MetricasRagCards } from './metricas-rag-cards';
import { MetricasCotizadorCards } from './metricas-cotizador-cards';
import { MetricasAgendamientoCards } from './metricas-agendamiento-cards';
import { MetricasSkeleton } from './metricas-skeleton';
import { MetricasErrorState } from './metricas-error-state';
import { MetricasEmptyState } from './metricas-empty-state';

// ─── Sub-componentes internos ────────────────────────────────────────────────

function GeneralesContent({ period }: { period: MetricPeriod }) {
  const { data, loading, error, retry } = useMetricasGenerales(period);

  if (loading) return <MetricasSkeleton />;
  if (error)   return <MetricasErrorState onRetry={retry} />;
  if (!data || data.totalConversations === 0) return <MetricasEmptyState />;

  return <MetricasGeneralesCards data={data} />;
}

function AgentContent({
  agentType,
  period,
}: {
  agentType: Exclude<AgentTypeFilter, 'todos'>;
  period: MetricPeriod;
}) {
  const { data, loading, error, retry } = useMetricasPorTipo(agentType, period);

  if (loading) return <MetricasSkeleton />;
  if (error)   return <MetricasErrorState onRetry={retry} />;
  if (!data || data.successRate === 0) return <MetricasEmptyState />;

  if (agentType === 'rag')          return <MetricasRagCards data={data} />;
  if (agentType === 'cotizador')    return <MetricasCotizadorCards data={data} />;
  if (agentType === 'agendamiento') return <MetricasAgendamientoCards data={data} />;

  return null;
}

// ─── Bloque histórico principal ───────────────────────────────────────────────

interface MetricasHistoricoBlockProps {
  period: MetricPeriod;
  agentFilter: AgentTypeFilter;
  onPeriodChange: (p: MetricPeriod) => void;
  onAgentChange: (a: AgentTypeFilter) => void;
}

export function MetricasHistoricoBlock({
  period,
  agentFilter,
  onPeriodChange,
  onAgentChange,
}: MetricasHistoricoBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Selectores */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <MetricasAgentSelector value={agentFilter} onChange={onAgentChange} />
        <MetricasPeriodSelector value={period} onChange={onPeriodChange} />
      </div>

      {/* Contenido según filtro */}
      {agentFilter === 'todos' ? (
        <GeneralesContent period={period} />
      ) : (
        <AgentContent agentType={agentFilter} period={period} />
      )}
    </div>
  );
}
