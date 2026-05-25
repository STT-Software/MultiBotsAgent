/**
 * Constantes del feature Knowledge Base.
 * Tokens visuales del design system Obsidian Nexus y configuración de estados.
 */

import type { StatusConfig, StatusVariant } from '../types';

// ─── Design Tokens (Obsidian Nexus) ──────────────────────────────────────────

export const COLORS = {
  surface: '#131313',
  card: '#0F0F0F',
  border: '#262626',
  primary: '#42e5a1',
  onPrimary: '#0a0a0a',
  text: '#e5e2e1',
  textMuted: '#888888',
  statusProcessing: '#3B82F6',
  statusError: '#EF4444',
  statusWarning: '#F59E0B',
  statusSuccess: '#42e5a1',
  modalGlow: 'rgba(0, 200, 135, 0.1)',
} as const;

// ─── Status Configuration ────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<StatusVariant, StatusConfig> = {
  processing: {
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.1)',
    label: 'Procesando',
    pulse: true,
  },
  indexed: {
    color: '#42e5a1',
    bgColor: 'rgba(66,229,161,0.1)',
    label: 'Indexado',
    pulse: false,
  },
  failed: {
    color: '#EF4444',
    bgColor: 'rgba(239,68,68,0.1)',
    label: 'Fallido',
    pulse: false,
  },
  partial: {
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
    label: 'Parcial',
    pulse: false,
  },
};

// ─── Progress Labels ─────────────────────────────────────────────────────────

export const PROGRESS_LABELS: Record<string, string> = {
  extracting: 'Extrayendo texto...',
  chunking: 'Segmentando documento...',
  embedding: 'Generando embeddings...',
  storing: 'Almacenando fragmentos...',
};

// ─── Polling ─────────────────────────────────────────────────────────────────

/** Intervalo de polling en milisegundos */
export const POLLING_INTERVAL_MS = 5000;

// ─── Format Labels ───────────────────────────────────────────────────────────

export const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  txt: 'TXT',
  md: 'MD',
};
