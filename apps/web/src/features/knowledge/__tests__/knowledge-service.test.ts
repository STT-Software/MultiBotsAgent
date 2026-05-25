/**
 * Tests para knowledge.service.ts.
 * Valida: llamadas HTTP correctas, manejo de errores.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSourcesByAgent,
  getSourceStatus,
  createTextContent,
  deleteSource,
  reprocessSource,
} from '../services/knowledge.service';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('knowledge.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSourcesByAgent', () => {
    it('llama al endpoint correcto y retorna datos', async () => {
      const mockData = [{ id: 'src-1', title: 'Test' }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await getSourcesByAgent('agent-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/knowledge/agent/agent-123'),
      );
      expect(result).toEqual(mockData);
    });

    it('lanza error cuando la respuesta no es ok', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(getSourcesByAgent('agent-123')).rejects.toThrow('Error al obtener fuentes: 500');
    });
  });

  describe('getSourceStatus', () => {
    it('llama al endpoint correcto', async () => {
      const mockData = { id: 'src-1', status: 'indexed' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await getSourceStatus('src-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/knowledge/src-1'),
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('createTextContent', () => {
    it('envía POST con body JSON correcto', async () => {
      const mockData = { id: 'src-new', status: 'processing' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await createTextContent('agent-1', 'FAQ', '## Contenido');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/knowledge/text'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: 'agent-1', title: 'FAQ', content: '## Contenido' }),
        }),
      );
      expect(result).toEqual(mockData);
    });

    it('lanza error cuando falla', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 400 });

      await expect(createTextContent('agent-1', '', '')).rejects.toThrow('Error al crear contenido: 400');
    });
  });

  describe('deleteSource', () => {
    it('envía DELETE al endpoint correcto', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await deleteSource('src-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/knowledge/src-1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('lanza error cuando falla', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      await expect(deleteSource('src-999')).rejects.toThrow('Error al eliminar fuente: 404');
    });
  });

  describe('reprocessSource', () => {
    it('envía POST al endpoint de reprocess', async () => {
      const mockData = { id: 'src-1', status: 'processing' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await reprocessSource('src-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/knowledge/src-1/reprocess'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result).toEqual(mockData);
    });
  });
});
