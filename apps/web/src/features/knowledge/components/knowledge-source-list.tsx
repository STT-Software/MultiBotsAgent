'use client';

import type { SourceListProps } from '../types';
import { KnowledgeSourceRow } from './knowledge-source-row';

/**
 * Tabla de alta densidad con todas las fuentes de conocimiento del agente.
 */
export function KnowledgeSourceList({ sources, onDelete, onReprocess, onSelect }: SourceListProps) {
  const sorted = [...sources].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="overflow-x-auto rounded border border-[#262626] bg-[#0F0F0F]">
      <table className="w-full text-left" role="table">
        <thead>
          <tr className="border-b border-[#262626] text-xs font-mono uppercase tracking-wider text-[#888888]">
            <th className="px-4 py-2.5">Título</th>
            <th className="px-4 py-2.5">Formato</th>
            <th className="px-4 py-2.5">Tamaño</th>
            <th className="px-4 py-2.5">Estado</th>
            <th className="px-4 py-2.5">Fragmentos</th>
            <th className="px-4 py-2.5">Fecha</th>
            <th className="px-4 py-2.5">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((source) => (
            <KnowledgeSourceRow
              key={source.id}
              source={source}
              onDelete={onDelete}
              onReprocess={onReprocess}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
