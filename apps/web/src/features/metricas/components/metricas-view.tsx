'use client';

import { useState } from 'react';
import type { AgentTypeFilter, MetricPeriod } from '../types/metricas.types';
import { useMetricasWs } from '../hooks/use-metricas-ws';
import { MetricasLiveBlock } from './metricas-live-block';
import { MetricasHistoricoBlock } from './metricas-historico-block';

/**
 * Vista principal de métricas.
 * - Bloque superior: actividad en vivo via WebSocket (contadores + feed).
 * - Bloque inferior: métricas históricas via REST con selectores de período y tipo de agente.
 *
 * Los dos bloques son independientes: cambiar los filtros históricos
 * no afecta la conexión WebSocket.
 */
export function MetricasView() {
  const liveState = useMetricasWs();
  const [period, setPeriod] = useState<MetricPeriod>('7d');
  const [agentFilter, setAgentFilter] = useState<AgentTypeFilter>('todos');

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#dde5dc" }}>
          Métricas y Analíticas
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "#bbcabe" }}>
          Actividad en tiempo real y métricas históricas de tus agentes
        </p>
      </div>

      {/* Bloque en vivo */}
      <section aria-label="Actividad en vivo">
        <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: '#5a6b5e' }}>
          En vivo
        </p>
        <MetricasLiveBlock liveState={liveState} />
      </section>

      {/* Divisor */}
      <hr style={{ borderColor: '#2f3731' }} />

      {/* Bloque histórico */}
      <section aria-label="Métricas históricas">
        <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: '#5a6b5e' }}>
          Histórico
        </p>
        <MetricasHistoricoBlock
          period={period}
          agentFilter={agentFilter}
          onPeriodChange={setPeriod}
          onAgentChange={setAgentFilter}
        />
      </section>
    </div>
  );
}
