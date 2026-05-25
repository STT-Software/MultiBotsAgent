'use client';

import { RotateCw, Trash2, Edit3, X } from 'lucide-react';
import type { KnowledgeSource } from '@multibotagents/types';
import type { StatusVariant } from '../types';
import { KnowledgeStatusBadge } from './knowledge-status-badge';
import { FORMAT_LABELS } from '../constants';

interface KnowledgeSourceDetailProps {
  source: KnowledgeSource;
  onClose: () => void;
  onDelete: (sourceId: string) => void;
  onReprocess: (sourceId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Panel de detalle de una fuente de conocimiento.
 * Muestra metadata completa, errores y acciones contextuales.
 */
export function KnowledgeSourceDetail({ source, onClose, onDelete, onReprocess }: KnowledgeSourceDetailProps) {
  const canReprocess = source.status === 'failed' || source.status === 'partial';

  return (
    <div className="rounded border border-[#262626] bg-[#0F0F0F] p-5 animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#e5e2e1]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            {source.title}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-[#888888]">
            ID: {source.id}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[#888888] transition-colors hover:bg-[#262626] hover:text-[#e5e2e1]"
          aria-label="Cerrar detalle"
        >
          <X size={16} />
        </button>
      </div>

      {/* Status */}
      <div className="mb-4">
        <KnowledgeStatusBadge status={source.status as StatusVariant} progress={source.progress} />
      </div>

      {/* Error block */}
      {source.errorReason && (
        <div className="mb-4 rounded border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2">
          <p className="font-mono text-xs text-[#EF4444]">{source.errorReason}</p>
        </div>
      )}

      {/* Metadata grid */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#888888]">Tipo</span>
          <span className="text-sm text-[#e5e2e1]">{source.type === 'file' ? 'Archivo' : 'Texto'}</span>
        </div>
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#888888]">Formato</span>
          <span className="font-mono text-sm text-[#e5e2e1]">{FORMAT_LABELS[source.format] ?? source.format}</span>
        </div>
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#888888]">Tamaño</span>
          <span className="font-mono text-sm text-[#e5e2e1]">{formatFileSize(source.fileSizeBytes)}</span>
        </div>
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#888888]">Fragmentos</span>
          <span className="font-mono text-sm text-[#e5e2e1]">{source.fragmentCount || '—'}</span>
        </div>
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#888888]">Creado</span>
          <span className="text-sm text-[#e5e2e1]">{formatDateTime(source.createdAt)}</span>
        </div>
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#888888]">Procesado</span>
          <span className="text-sm text-[#e5e2e1]">{source.processedAt ? formatDateTime(source.processedAt) : '—'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-[#262626] pt-4">
        {canReprocess && (
          <button
            type="button"
            onClick={() => onReprocess(source.id)}
            className="inline-flex items-center gap-1.5 rounded border border-[#42e5a1] bg-transparent px-3 py-1.5 text-xs font-medium text-[#42e5a1] transition-colors hover:bg-[#42e5a1]/10"
          >
            <RotateCw size={12} />
            Re-procesar
          </button>
        )}
        {source.type === 'text' && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded border border-[#262626] bg-transparent px-3 py-1.5 text-xs text-[#888888] transition-colors hover:border-[#888888] hover:text-[#e5e2e1]"
          >
            <Edit3 size={12} />
            Editar
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(source.id)}
          className="inline-flex items-center gap-1.5 rounded border border-[#EF4444]/50 bg-transparent px-3 py-1.5 text-xs text-[#EF4444] transition-colors hover:bg-[#EF4444]/10"
        >
          <Trash2 size={12} />
          Eliminar
        </button>
      </div>
    </div>
  );
}
