'use client';

import { X } from 'lucide-react';
import type { TextEditorProps } from '../types';

/**
 * Editor de contenido textual Markdown con toolbar básica.
 */
export function KnowledgeTextEditor({
  isOpen,
  title,
  content,
  isSubmitting,
  error,
  onClose,
  onTitleChange,
  onContentChange,
  onSubmit,
}: TextEditorProps) {
  if (!isOpen) return null;

  return (
    <div className="rounded border border-[#262626] bg-[#0F0F0F] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#e5e2e1]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
          Crear contenido textual
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[#888888] transition-colors hover:bg-[#262626] hover:text-[#e5e2e1]"
          aria-label="Cerrar editor"
        >
          <X size={16} />
        </button>
      </div>

      {/* Título */}
      <div className="mb-3">
        <label htmlFor="knowledge-title" className="mb-1 block font-mono text-xs text-[#888888]">
          TÍTULO
        </label>
        <input
          id="knowledge-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ej: Preguntas frecuentes"
          className="w-full rounded border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-sm text-[#e5e2e1] placeholder-[#555] outline-none transition-colors focus:border-[#42e5a1] focus:ring-1 focus:ring-[#42e5a1]/50"
          disabled={isSubmitting}
        />
      </div>

      {/* Contenido Markdown */}
      <div className="mb-3">
        <label htmlFor="knowledge-content" className="mb-1 block font-mono text-xs text-[#888888]">
          CONTENIDO (MARKDOWN)
        </label>
        <textarea
          id="knowledge-content"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="## Sección&#10;&#10;Escribe el contenido aquí usando Markdown..."
          rows={12}
          className="w-full resize-y rounded border border-[#262626] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-[#e5e2e1] placeholder-[#555] outline-none transition-colors focus:border-[#42e5a1] focus:ring-1 focus:ring-[#42e5a1]/50"
          disabled={isSubmitting}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="mb-3 text-xs text-[#EF4444]" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-[#262626] bg-transparent px-4 py-2 text-sm text-[#888888] transition-colors hover:border-[#888888] hover:text-[#e5e2e1]"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded bg-[#42e5a1] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#3be09d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
