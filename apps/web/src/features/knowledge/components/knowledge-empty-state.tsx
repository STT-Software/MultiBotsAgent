'use client';

import { FileText, Plus } from 'lucide-react';

interface KnowledgeEmptyStateProps {
  onUploadClick: () => void;
  onCreateTextClick: () => void;
}

/**
 * Estado vacío cuando no hay fuentes de conocimiento.
 */
export function KnowledgeEmptyState({ onUploadClick, onCreateTextClick }: KnowledgeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-[#262626] bg-[#0F0F0F] px-8 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#262626] bg-[#131313]">
        <FileText size={28} className="text-[#888888]" aria-hidden="true" />
      </div>

      <h3 className="mb-2 text-lg font-semibold text-[#e5e2e1]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
        Sin fuentes de conocimiento
      </h3>

      <p className="mb-8 max-w-sm text-sm text-[#888888]">
        Agrega documentos o contenido textual para que el agente pueda responder preguntas basadas en tu información.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 rounded bg-[#42e5a1] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#3be09d]"
        >
          <Plus size={16} />
          Subir archivo
        </button>
        <button
          type="button"
          onClick={onCreateTextClick}
          className="inline-flex items-center gap-2 rounded border border-[#42e5a1] bg-transparent px-4 py-2 text-sm font-medium text-[#42e5a1] transition-colors hover:bg-[#42e5a1]/10"
        >
          <FileText size={16} />
          Crear contenido
        </button>
      </div>
    </div>
  );
}
