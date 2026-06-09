'use client';

import type { MetricPeriod } from '../types/metricas.types';

const OPTIONS: { value: MetricPeriod; label: string }[] = [
  { value: '24h', label: '24 horas' },
  { value: '7d',  label: '7 días' },
  { value: '30d', label: '30 días' },
];

interface MetricasPeriodSelectorProps {
  value: MetricPeriod;
  onChange: (p: MetricPeriod) => void;
  disabled?: boolean;
}

export function MetricasPeriodSelector({ value, onChange, disabled }: MetricasPeriodSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}>
      {OPTIONS.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isActive ? '#00bb7a' : 'transparent',
              color: isActive ? '#0d1f17' : '#869489',
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
