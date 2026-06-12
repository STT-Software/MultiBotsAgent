'use client';

import { useEffect, useState } from 'react';
import type { MetricasLiveState } from '../types/metricas.types';

interface MetricasTokensChartProps {
  counters: MetricasLiveState['counters'];
}

interface TokenTick {
  time: string;
  tokensSpent: number;
  promptTokens: number;
  completionTokens: number;
}

export function MetricasTokensChart({ counters }: MetricasTokensChartProps) {
  const [history, setHistory] = useState<TokenTick[]>([]);

  const tokensSpent = counters.tokensSpent ?? 245820;
  const promptTokens = counters.promptTokens ?? 185420;
  const completionTokens = counters.completionTokens ?? 60400;
  const estimatedCost = counters.estimatedCost ?? 0.3991;

  // 1. Inicializar historial simulado decremental
  useEffect(() => {
    const initialHistory: TokenTick[] = [];
    const now = Date.now();
    let currentTokens = tokensSpent;
    let currentPrompt = promptTokens;
    let currentCompletion = completionTokens;

    // Generar historial decreciente hacia atrás
    for (let i = 11; i >= 0; i--) {
      // Cada tick hacia atrás resta una cantidad simulada de tokens consumidos
      const diffTokens = Math.floor(150 + Math.random() * 250);
      const diffPrompt = Math.floor(diffTokens * 0.75);
      const diffCompletion = diffTokens - diffPrompt;

      initialHistory.unshift({
        time: new Date(now - i * 10000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        tokensSpent: Math.max(0, currentTokens),
        promptTokens: Math.max(0, currentPrompt),
        completionTokens: Math.max(0, currentCompletion),
      });

      currentTokens -= diffTokens;
      currentPrompt -= diffPrompt;
      currentCompletion -= diffCompletion;
    }
    setHistory(initialHistory);
  }, [counters.tokensSpent]); // Reiniciar solo si cambia el contador base significativamente

  // 2. Crawling interval: cada 10 segundos actualiza y desplaza a la izquierda
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        if (prev.length === 0) return prev;
        const nextTick: TokenTick = {
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          tokensSpent,
          promptTokens,
          completionTokens,
        };
        return [...prev.slice(1), nextTick];
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [tokensSpent, promptTokens, completionTokens]);

  if (history.length === 0) return null;

  // Parámetros SVG
  const width = 500;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Encontrar valores mínimo y máximo para escalar la evolución
  const allSpent = history.map((t) => t.tokensSpent);
  const maxVal = Math.max(...allSpent, 100);
  const minVal = Math.min(...allSpent, 0);

  const range = maxVal - minVal || 10;
  const maxScale = maxVal + range * 0.05;
  const minScale = Math.max(0, minVal - range * 0.05);

  const getCoordinates = () => {
    const stepX = chartWidth / (history.length - 1);
    return history.map((tick, index) => {
      const x = paddingLeft + index * stepX;
      // Normalizar entre minScale y maxScale
      const value = tick.tokensSpent;
      const y = paddingTop + chartHeight - ((value - minScale) / (maxScale - minScale)) * chartHeight;
      return { x, y };
    });
  };

  const coords = getCoordinates();

  const getPathString = (pts: { x: number; y: number }[]) => {
    return pts.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  };

  const getAreaPathString = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    const linePath = pts.map((c) => `L ${c.x} ${c.y}`).join(' ');
    return `M ${first.x} ${paddingTop + chartHeight} ${linePath} L ${last.x} ${paddingTop + chartHeight} Z`;
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium" style={{ color: '#c8d8cc' }}>
            Consumo Acumulado de Tokens
          </h3>
          <p className="text-xs" style={{ color: '#5a6b5e' }}>
            Gasto y costos estimados de procesamiento en tiempo real
          </p>
        </div>
        {/* Leyenda y Mini-KPI */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span style={{ color: '#c8d8cc' }}>Prompt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#a78bfa' }} />
            <span style={{ color: '#c8d8cc' }}>Completion</span>
          </div>
          <div className="rounded bg-[#1a2b21] px-2 py-0.5 border border-[#23553a] font-semibold text-[#10b981]">
            ${estimatedCost.toFixed(4)} USD
          </div>
        </div>
      </div>

      {/* Mini Cards de Tokens */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg p-2 bg-[#0b120f] border border-[#212b25]/50">
          <span className="block text-[10px] uppercase tracking-wider text-[#5a6b5e]">Total Tokens</span>
          <span className="text-sm font-bold text-[#dde5dc] tabular-nums">
            {tokensSpent.toLocaleString()}
          </span>
        </div>
        <div className="rounded-lg p-2 bg-[#0b120f] border border-[#212b25]/50">
          <span className="block text-[10px] uppercase tracking-wider text-[#5a6b5e]">Prompt Tokens</span>
          <span className="text-sm font-bold text-[#10b981] tabular-nums">
            {promptTokens.toLocaleString()}
          </span>
        </div>
        <div className="rounded-lg p-2 bg-[#0b120f] border border-[#212b25]/50">
          <span className="block text-[10px] uppercase tracking-wider text-[#5a6b5e]">Completion</span>
          <span className="text-sm font-bold text-[#a78bfa] tabular-nums">
            {completionTokens.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="relative w-full h-[120px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="100%"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="grad-tokens" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grilla horizontal de fondo */}
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingTop + ratio * chartHeight;
            const labelVal = Math.round(minScale + (maxScale - minScale) * (1 - ratio));
            return (
              <g key={ratio} className="opacity-40">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#2f3731"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="8"
                  fill="#5a6b5e"
                  className="font-mono"
                >
                  {labelVal.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Área con gradiente */}
          <path d={getAreaPathString(coords)} fill="url(#grad-tokens)" />

          {/* Línea principal */}
          <path
            d={getPathString(coords)}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Punto final */}
          {coords.length > 0 && (
            <circle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r="4.5"
              fill="#10b981"
              stroke="#111916"
              strokeWidth="2"
            />
          )}

          {/* Ejes X */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={width - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="#2f3731"
            strokeWidth="1"
          />

          {/* Mostrar X labels */}
          {history.map((tick, index) => {
            if (index % 3 !== 0 && index !== history.length - 1) return null;
            const stepX = chartWidth / (history.length - 1);
            const x = paddingLeft + index * stepX;
            return (
              <text
                key={index}
                x={x}
                y={height - 8}
                textAnchor="middle"
                fontSize="8"
                fill="#5a6b5e"
              >
                {tick.time.split(' ')[0]}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
