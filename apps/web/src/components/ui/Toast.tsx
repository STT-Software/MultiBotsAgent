'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error';

export interface ToastProps {
  /** Mensaje a mostrar en el toast. */
  message: string;
  /** Variante visual y de comportamiento del toast. */
  variant: ToastVariant;
  /** Callback cuando el toast se descarta (manual o auto). */
  onDismiss: () => void;
  /**
   * Duración en ms antes de auto-descarte.
   * - Success: 5000ms por defecto
   * - Error: null (no se auto-descarta, requiere descarte manual)
   */
  duration?: number | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Componente Toast accesible para notificaciones de feedback.
 *
 * - Success: `role="status"` (polite announcement), auto-dismiss en 5s, descartable.
 * - Error: `role="alert"` (assertive announcement), visible hasta descarte manual.
 *
 * Cumple ARIA:
 * - role="status" para éxito (lectores de pantalla anuncian de forma no intrusiva)
 * - role="alert" para error (lectores de pantalla anuncian inmediatamente)
 */
export function Toast({ message, variant, onDismiss, duration }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Determinar duración: success = 5000ms, error = null (sin auto-dismiss)
  const effectiveDuration = duration !== undefined ? duration : variant === 'success' ? 5000 : null;

  // Auto-dismiss timer
  useEffect(() => {
    if (effectiveDuration === null) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, effectiveDuration);

    return () => clearTimeout(timer);
  }, [effectiveDuration, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss();
  }, [onDismiss]);

  if (!isVisible) return null;

  const isSuccess = variant === 'success';
  const ariaRole = isSuccess ? 'status' : 'alert';

  return (
    <div
      role={ariaRole}
      aria-live={isSuccess ? 'polite' : 'assertive'}
      aria-atomic="true"
      className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition-all duration-300 ${
        isSuccess
          ? 'border-[#49df9a]/20 bg-[#49df9a]/5 text-[#49df9a]'
          : 'border-red-500/20 bg-red-500/5 text-red-400'
      }`}
    >
      {/* Icon */}
      {isSuccess ? (
        <svg
          className="h-4 w-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      )}

      {/* Message */}
      <span className="flex-1">{message}</span>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className={`flex-shrink-0 rounded p-0.5 transition-colors ${
          isSuccess
            ? 'hover:bg-[#49df9a]/10 text-[#49df9a]/70 hover:text-[#49df9a]'
            : 'hover:bg-red-500/10 text-red-400/70 hover:text-red-400'
        }`}
        aria-label="Descartar notificación"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
