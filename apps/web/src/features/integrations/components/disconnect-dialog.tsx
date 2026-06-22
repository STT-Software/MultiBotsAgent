'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface DisconnectDialogProps {
  isOpen: boolean;
  /** Nombre del proveedor a desconectar (para el mensaje). */
  providerName: string | null;
  /** Cuenta vinculada, si se conoce (refuerza qué se va a desconectar). */
  accountName?: string;
  /** La desconexión está en curso. */
  isDisconnecting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación de desconexión de una integración (SL13, slice 2).
 *
 * Advierte que los agentes perderán acceso a esa fuente antes de revocar y
 * limpiar los tokens (R6.1). Focus trap nativo, cierre con Escape.
 */
export function DisconnectDialog({
  isOpen,
  providerName,
  accountName,
  isDisconnecting,
  onConfirm,
  onCancel,
}: DisconnectDialogProps) {
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

  if (!providerName) return null;

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-w-md rounded border border-[#262626] bg-[#0F0F0F] p-0 text-[#e5e2e1] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      style={{ boxShadow: '0 8px 24px rgba(0, 200, 135, 0.1)' }}
      role="alertdialog"
      aria-labelledby="disconnect-dialog-title"
      aria-describedby="disconnect-dialog-desc"
    >
      <div className="p-6">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#EF4444]/10">
          <AlertTriangle size={20} className="text-[#EF4444]" aria-hidden="true" />
        </div>

        <h2
          id="disconnect-dialog-title"
          className="mb-2 text-base font-semibold text-[#e5e2e1]"
        >
          Desconectar {providerName}
        </h2>

        <p id="disconnect-dialog-desc" className="mb-4 text-sm text-[#888888]">
          Tus agentes dejarán de tener acceso a{' '}
          <span className="font-medium text-[#e5e2e1]">{providerName}</span>
          {accountName && (
            <>
              {' '}
              (<span className="font-medium text-[#e5e2e1]">{accountName}</span>)
            </>
          )}{' '}
          como fuente. Se revocará el acceso y se eliminarán los tokens guardados.
          Podrás volver a conectarla cuando quieras.
        </p>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isDisconnecting}
            className="rounded border border-[#262626] bg-transparent px-4 py-2 text-sm text-[#888888] transition-colors hover:border-[#888888] hover:text-[#e5e2e1]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDisconnecting}
            className="rounded border border-[#EF4444] bg-transparent px-4 py-2 text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDisconnecting ? 'Desconectando…' : 'Desconectar'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
