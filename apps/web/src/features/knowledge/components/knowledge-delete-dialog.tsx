'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { KnowledgeSource } from '@multibotagents/types';

interface KnowledgeDeleteDialogProps {
  isOpen: boolean;
  source: KnowledgeSource | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación para eliminación de fuentes.
 * Focus trap, cierre con Escape, retorno de foco.
 */
export function KnowledgeDeleteDialog({
  isOpen,
  source,
  isDeleting,
  onConfirm,
  onCancel,
}: KnowledgeDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCancel();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onCancel]);

  if (!source) return null;

  const isProcessing = source.status === 'processing';

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-w-md rounded border border-[#262626] bg-[#0F0F0F] p-0 text-[#e5e2e1] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      style={{ boxShadow: '0 8px 24px rgba(0, 200, 135, 0.1)' }}
      role="alertdialog"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
    >
      <div className="p-6">
        {/* Icon */}
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#EF4444]/10">
          <AlertTriangle size={20} className="text-[#EF4444]" aria-hidden="true" />
        </div>

        {/* Title */}
        <h2 id="delete-dialog-title" className="mb-2 text-base font-semibold text-[#e5e2e1]">
          Eliminar fuente de conocimiento
        </h2>

        {/* Description */}
        <p id="delete-dialog-desc" className="mb-2 text-sm text-[#888888]">
          ¿Estás seguro de eliminar <span className="font-medium text-[#e5e2e1]">&ldquo;{source.title}&rdquo;</span>?
          Esta acción es irreversible. Se eliminarán todos los fragmentos indexados y el archivo original.
        </p>

        {/* Warning for processing sources */}
        {isProcessing && (
          <p className="mb-4 rounded border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-xs text-[#F59E0B]">
            Esta fuente está en procesamiento. Al eliminarla se cancelará el procesamiento en curso.
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded border border-[#262626] bg-transparent px-4 py-2 text-sm text-[#888888] transition-colors hover:border-[#888888] hover:text-[#e5e2e1]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded border border-[#EF4444] bg-transparent px-4 py-2 text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
