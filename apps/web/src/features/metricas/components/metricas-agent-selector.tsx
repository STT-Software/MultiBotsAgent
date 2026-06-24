'use client';

import type { AgentTypeFilter } from '../types/metricas.types';

const OPTIONS: { value: AgentTypeFilter; label: string }[] = [
  { value: 'todos',         label: 'Todos' },
  { value: 'rag',           label: 'RAG' },
  { value: 'cotizador',     label: 'Cotizador' },
  { value: 'agendamiento',  label: 'Agendamiento' },
];

interface MetricasAgentSelectorProps {
  value: AgentTypeFilter;
  onChange: (a: AgentTypeFilter) => void;
}

export function MetricasAgentSelector({ value, onChange }: MetricasAgentSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg p-1" style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}>
      {OPTIONS.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: isActive ? '#1a3d2f' : 'transparent',
              color: isActive ? '#00bb7a' : '#869489',
              border: isActive ? '1px solid #00bb7a' : '1px solid transparent',
            }}
            aria-pressed={isActive}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
