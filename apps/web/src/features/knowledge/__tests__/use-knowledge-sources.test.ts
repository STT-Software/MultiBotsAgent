/**
 * Tests para el hook useKnowledgeSources.
 * Valida: fetch inicial, delete optimista, reprocess optimista, manejo de errores.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useKnowledgeSources } from '../hooks/use-knowledge-sources';
import * as service from '../services/knowledge.service';

vi.mock('../services/knowledge.service');

const mockSources = [
  {
    id: 'src-1',
    agentId: 'agent-1',
    companyId: 'company-1',
    title: 'Manual de usuario',
    type: 'file' as const,
    format: 'pdf' as const,
    originalFileKey: 'company-1/agent-1/src-1/manual.pdf',
    fileSizeBytes: 50000,
    status: 'indexed' as const,
    progress: undefined,
    fragmentCount: 12,
    errorReason: undefined,
    metadata: {},
    createdAt: new Date('2026-05-20'),
    updatedAt: new Date('2026-05-20'),
    processedAt: new Date('2026-05-20'),
  },
  {
    id: 'src-2',
    agentId: 'agent-1',
    companyId: 'company-1',
    title: 'FAQ',
    type: 'text' as const,
    format: 'md' as const,
    originalFileKey: 'company-1/agent-1/src-2/faq.md',
    fileSizeBytes: 2000,
    status: 'indexed' as const,
    progress: undefined,
    fragmentCount: 5,
    errorReason: undefined,
    metadata: {},
    createdAt: new Date('2026-05-21'),
    updatedAt: new Date('2026-05-21'),
    processedAt: new Date('2026-05-21'),
  },
];

describe('useKnowledgeSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(service.getSourcesByAgent).mockResolvedValue(mockSources);
    vi.mocked(service.deleteSource).mockResolvedValue(undefined);
    vi.mocked(service.reprocessSource).mockResolvedValue({
      ...mockSources[0],
      status: 'processing',
      progress: 'extracting',
      fragmentCount: 0,
    });
  });

  it('carga las fuentes al montar', async () => {
    const { result } = renderHook(() => useKnowledgeSources('agent-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sources).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(service.getSourcesByAgent).toHaveBeenCalledWith('agent-1');
  });

  it('muestra error cuando el fetch falla', async () => {
    vi.mocked(service.getSourcesByAgent).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useKnowledgeSources('agent-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.sources).toHaveLength(0);
  });

  it('elimina una fuente de forma optimista', async () => {
    const { result } = renderHook(() => useKnowledgeSources('agent-1'));

    await waitFor(() => {
      expect(result.current.sources).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleDelete('src-1');
    });

    expect(result.current.sources).toHaveLength(1);
    expect(result.current.sources[0].id).toBe('src-2');
    expect(service.deleteSource).toHaveBeenCalledWith('src-1');
  });

  it('actualiza estado a processing al re-procesar', async () => {
    const { result } = renderHook(() => useKnowledgeSources('agent-1'));

    await waitFor(() => {
      expect(result.current.sources).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleReprocess('src-1');
    });

    const updated = result.current.sources.find((s) => s.id === 'src-1');
    expect(updated?.status).toBe('processing');
    expect(service.reprocessSource).toHaveBeenCalledWith('src-1');
  });

  it('refetch recarga las fuentes', async () => {
    const { result } = renderHook(() => useKnowledgeSources('agent-1'));

    await waitFor(() => {
      expect(result.current.sources).toHaveLength(2);
    });

    vi.mocked(service.getSourcesByAgent).mockResolvedValue([mockSources[0]]);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.sources).toHaveLength(1);
  });
});
