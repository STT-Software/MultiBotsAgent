'use client';

import { RotateCw, Trash2 } from 'lucide-react';
import type { SourceRowProps, StatusVariant } from '../types';
import { FORMAT_LABELS } from '../constants';
import { KnowledgeStatusBadge } from './knowledge-status-badge';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Fila individual de una fuente de conocimiento en la tabla.
 */
export function KnowledgeSourceRow({ source, onDelete, onReprocess, onSelect }: SourceRowProps) {
  const canReprocess = source.status === 'failed' || source.status === 'partial';
  const isProcessing = source.status === 'processing';

  return (
    <tr
      className="border-b border-[#262626] transition-colors hover:bg-[#1a1a1a] cursor-pointer"
      onClick={() => onSelect(source)}
      role="row"
    >
      {/* Título */}
      <td className="px-4 py-3 text-sm text-[#e5e2e1]">
        <span className="line-clamp-1">{source.title}</span>
      </td>

      {/* Formato */}
      <td className="px-4 py-3">
        <span className="inline-block rounded bg-[#262626] px-1.5 py-0.5 font-mono text-xs text-[#888888]">
          {FORMAT_LABELS[source.format] ?? source.format.toUpperCase()}
        </span>
      </td>

      {/* Tamaño */}
      <td className="px-4 py-3 font-mono text-xs text-[#888888]">
        {formatFileSize(source.fileSizeBytes)}
      </td>

      {/* Estado */}
      <td className="px-4 py-3">
        <KnowledgeStatusBadge
          status={source.status as StatusVariant}
          progress={source.progress}
        />
      </td>

      {/* Fragmentos */}
      <td className="px-4 py-3 font-mono text-xs text-[#888888]">
        {source.fragmentCount > 0 ? source.fragmentCount : '—'}
      </td>

      {/* Fecha */}
      <td className="px-4 py-3 text-xs text-[#888888]">
        {formatDate(source.createdAt)}
      </td>

      {/* Acciones */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canReprocess && (
            <button
              type="button"
              onClick={() => onReprocess(source.id)}
              className="rounded p-1.5 text-[#888888] transition-colors hover:bg-[#262626] hover:text-[#42e5a1]"
              aria-label="Re-procesar fuente"
              disabled={isProcessing}
            >
              <RotateCw size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(source.id)}
            className="rounded p-1.5 text-[#888888] transition-colors hover:bg-[#262626] hover:text-[#EF4444]"
            aria-label="Eliminar fuente"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
