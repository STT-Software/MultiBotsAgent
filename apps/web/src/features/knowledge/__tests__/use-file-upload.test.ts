/**
 * Tests para el hook useFileUpload.
 * Valida: validación cliente (formato, tamaño), upload exitoso, errores.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '../hooks/use-file-upload';

// Mock XMLHttpRequest
const mockXHR = {
  open: vi.fn(),
  send: vi.fn(),
  upload: { onprogress: null as ((e: ProgressEvent) => void) | null },
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  status: 201,
  responseText: JSON.stringify({ id: 'new-source', status: 'processing' }),
};

vi.stubGlobal('XMLHttpRequest', vi.fn(() => mockXHR));

describe('useFileUpload', () => {
  const mockOnSuccess = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockXHR.status = 201;
    mockXHR.responseText = JSON.stringify({ id: 'new-source', status: 'processing' });
  });

  it('rechaza archivos con formato no soportado', async () => {
    const { result } = renderHook(() => useFileUpload('agent-1', mockOnSuccess));

    const file = new File(['content'], 'document.docx', { type: 'application/vnd.openxmlformats' });

    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.error).toContain('Formato no soportado');
    expect(result.current.isUploading).toBe(false);
    expect(mockXHR.send).not.toHaveBeenCalled();
  });

  it('rechaza archivos mayores a 10 MB', async () => {
    const { result } = renderHook(() => useFileUpload('agent-1', mockOnSuccess));

    // Crear un archivo de 11 MB
    const largeContent = new ArrayBuffer(11 * 1024 * 1024);
    const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.error).toContain('10 MB');
    expect(result.current.isUploading).toBe(false);
    expect(mockXHR.send).not.toHaveBeenCalled();
  });

  it('acepta archivos PDF válidos', async () => {
    const { result } = renderHook(() => useFileUpload('agent-1', mockOnSuccess));

    const file = new File(['pdf content'], 'manual.pdf', { type: 'application/pdf' });

    act(() => {
      result.current.upload(file);
    });

    expect(result.current.isUploading).toBe(true);
    expect(mockXHR.open).toHaveBeenCalledWith('POST', expect.stringContaining('/knowledge/upload'));
    expect(mockXHR.send).toHaveBeenCalled();
  });

  it('acepta archivos TXT válidos', async () => {
    const { result } = renderHook(() => useFileUpload('agent-1', mockOnSuccess));

    const file = new File(['text content'], 'notes.txt', { type: 'text/plain' });

    act(() => {
      result.current.upload(file);
    });

    expect(result.current.isUploading).toBe(true);
    expect(mockXHR.send).toHaveBeenCalled();
  });

  it('acepta archivos MD válidos', async () => {
    const { result } = renderHook(() => useFileUpload('agent-1', mockOnSuccess));

    const file = new File(['# Title'], 'readme.md', { type: 'text/markdown' });

    act(() => {
      result.current.upload(file);
    });

    expect(result.current.isUploading).toBe(true);
    expect(mockXHR.send).toHaveBeenCalled();
  });

  it('reset limpia el estado', async () => {
    const { result } = renderHook(() => useFileUpload('agent-1', mockOnSuccess));

    const file = new File(['content'], 'bad.docx', { type: 'application/vnd.openxmlformats' });

    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
    expect(result.current.isUploading).toBe(false);
  });
});
