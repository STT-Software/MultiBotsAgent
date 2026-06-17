'use client';

import { useEffect, useState } from 'react';

interface LiveCounters {
  conversationsResolved: number;
  conversationsActive: number;
  escalationsOpen: number;
}

interface MetricasLiveChartProps {
  counters: LiveCounters;
}

interface Tick {
  time: string;
  resolved: number;
  active: number;
  escalations: number;
}

export function MetricasLiveChart({ counters }: MetricasLiveChartProps) {
  const [history, setHistory] = useState<Tick[]>([]);

  // 1. Inicializar historial simulado basado en los contadores actuales
  useEffect(() => {
    const initialHistory: Tick[] = [];
    const now = Date.now();
    for (let i = 11; i >= 0; i--) {
      // Simular variaciones históricas leves
      const randFactor1 = 0.85 + (11 - i) * 0.01 + (Math.random() - 0.5) * 0.05;
      const randFactor2 = 0.9 + (Math.random() - 0.5) * 0.1;
      const randFactor3 = 0.95 + (Math.random() - 0.5) * 0.05;

      initialHistory.push({
        time: new Date(now - i * 10000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        resolved: Math.max(0, Math.round(counters.conversationsResolved * Math.min(1, randFactor1))),
        active: Math.max(0, Math.round(counters.conversationsActive * Math.min(1.2, randFactor2))),
        escalations: Math.max(0, Math.round(counters.escalationsOpen * Math.min(1.1, randFactor3))),
      });
    }
    setHistory(initialHistory);
  }, [counters.conversationsResolved, counters.conversationsActive, counters.escalationsOpen]);

  // 2. Crawling interval: cada 10 segundos actualiza y desplaza a la izquierda
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        if (prev.length === 0) return prev;
        const nextTick: Tick = {
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          resolved: counters.conversationsResolved,
          active: counters.conversationsActive,
          escalations: counters.escalationsOpen,
        };
        return [...prev.slice(1), nextTick];
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [counters]);

  if (history.length === 0) return null;

  // Parámetros de renderizado SVG
  const width = 500;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Obtener el valor máximo para escalar el gráfico correctamente
  const allValues = history.flatMap((t) => [t.resolved, t.active, t.escalations]);
  const maxValue = Math.max(...allValues, 5); // Escala mínima de 5 para que no sea plana con ceros

  // Helper para convertir datos a coordenadas SVG
  const getCoordinates = (getDataValue: (t: Tick) => number) => {
    const stepX = chartWidth / (history.length - 1);
    return history.map((tick, index) => {
      const x = paddingLeft + index * stepX;
      const val = getDataValue(tick);
      const y = paddingTop + chartHeight - (val / maxValue) * chartHeight;
      return { x, y };
    });
  };

  const resolvedCoords = getCoordinates((t) => t.resolved);
  const activeCoords = getCoordinates((t) => t.active);
  const escalationsCoords = getCoordinates((t) => t.escalations);

  // Generar strings de rutas (Path)
  const getPathString = (coords: { x: number; y: number }[]) => {
    return coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  };

  const getAreaPathString = (coords: { x: number; y: number }[]) => {
    if (coords.length === 0) return '';
    const first = coords[0];
    const last = coords[coords.length - 1];
    const linePath = coords.map((c) => `L ${c.x} ${c.y}`).join(' ');
    return `M ${first.x} ${paddingTop + chartHeight} ${linePath} L ${last.x} ${paddingTop + chartHeight} Z`;
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ backgroundColor: '#111916', border: '1px solid #3c4a41' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium" style={{ color: '#c8d8cc' }}>
            Gráfico de Métricas en Vivo
          </h3>
          <p className="text-xs" style={{ color: '#5a6b5e' }}>
            Evolución en tiempo real (desplazamiento cada 10s)
          </p>
        </div>
        {/* Leyenda */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span style={{ color: '#c8d8cc' }}>Resueltas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <span style={{ color: '#c8d8cc' }}>Activas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span style={{ color: '#c8d8cc' }}>Escalamientos</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[180px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="100%"
          className="overflow-visible"
        >
          {/* Definiciones de gradientes */}
          <defs>
            <linearGradient id="grad-resolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="grad-active" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="grad-escalations" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grilla horizontal de fondo */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + ratio * chartHeight;
            const labelVal = Math.round(maxValue * (1 - ratio));
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
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="#5a6b5e"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* Áreas bajo la curva con gradientes */}
          <path d={getAreaPathString(resolvedCoords)} fill="url(#grad-resolved)" />
          <path d={getAreaPathString(activeCoords)} fill="url(#grad-active)" />
          <path d={getAreaPathString(escalationsCoords)} fill="url(#grad-escalations)" />

          {/* Líneas principales */}
          <path
            d={getPathString(resolvedCoords)}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={getPathString(activeCoords)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={getPathString(escalationsCoords)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Últimos puntos (dots) para resaltar el tiempo real */}
          {resolvedCoords.length > 0 && (
            <circle
              cx={resolvedCoords[resolvedCoords.length - 1].x}
              cy={resolvedCoords[resolvedCoords.length - 1].y}
              r="4"
              fill="#10b981"
              stroke="#111916"
              strokeWidth="1.5"
            />
          )}
          {activeCoords.length > 0 && (
            <circle
              cx={activeCoords[activeCoords.length - 1].x}
              cy={activeCoords[activeCoords.length - 1].y}
              r="4"
              fill="#3b82f6"
              stroke="#111916"
              strokeWidth="1.5"
            />
          )}
          {escalationsCoords.length > 0 && (
            <circle
              cx={escalationsCoords[escalationsCoords.length - 1].x}
              cy={escalationsCoords[escalationsCoords.length - 1].y}
              r="4"
              fill="#f59e0b"
              stroke="#111916"
              strokeWidth="1.5"
            />
          )}

          {/* Ejes X con labels de tiempo */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={width - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="#2f3731"
            strokeWidth="1"
          />

          {/* Mostrar cada 3 ticks para no saturar el eje X */}
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
                {tick.time.split(' ')[0]} {/* Extraer solo HH:MM:SS */}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
