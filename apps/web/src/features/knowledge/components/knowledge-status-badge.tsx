'use client';

import { STATUS_CONFIG, PROGRESS_LABELS } from '../constants';
import type { StatusVariant } from '../types';

interface KnowledgeStatusBadgeProps {
  status: StatusVariant;
  progress?: string;
}

/**
 * Indicador visual de estado con dot animado y etiqueta.
 * Usa animación pulsante para "processing" y dots estáticos para otros estados.
 */
export function KnowledgeStatusBadge({ status, progress }: KnowledgeStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const progressLabel = progress ? PROGRESS_LABELS[progress] : null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-mono"
      style={{ backgroundColor: config.bgColor, color: config.color }}
      aria-label={`Estado: ${config.label}${progressLabel ? ` — ${progressLabel}` : ''}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />
      <span>{progressLabel ?? config.label}</span>
    </span>
  );
}
