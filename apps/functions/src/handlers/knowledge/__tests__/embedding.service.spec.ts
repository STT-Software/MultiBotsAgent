/**
 * Unit tests para BedrockEmbeddingService.
 *
 * Verifica la generación de embeddings individuales y en batch,
 * así como el manejo de errores transitorios de Bedrock.
 * Valida: Requisitos 5.1, 5.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BedrockEmbeddingService } from '../services/embedding.service';

// Mock del módulo @aws-sdk/client-bedrock-runtime
const mockSend = vi.fn();

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  return {
    BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    InvokeModelCommand: vi.fn().mockImplementation((input) => ({
      input,
    })),
  };
});

/**
 * Genera un vector fake de embedding con la dimensión especificada.
 */
function createFakeEmbedding(dimensions: number): number[] {
  return Array.from({ length: dimensions }, (_, i) => i * 0.001);
}

/**
 * Crea una respuesta mock de Bedrock con el embedding dado.
 */
function createBedrockResponse(embedding: number[]) {
  const responseBody = JSON.stringify({ embedding });
  return {
    body: new TextEncoder().encode(responseBody),
  };
}

describe('BedrockEmbeddingService', () => {
  let service: BedrockEmbeddingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BedrockEmbeddingService('us-east-1');
  });

  // ─── generateEmbedding ─────────────────────────────────────────────────────

  describe('generateEmbedding', () => {
    it('debe retornar un vector de 1024 dimensiones para texto válido', async () => {
      const fakeEmbedding = createFakeEmbedding(1024);
      mockSend.mockResolvedValueOnce(createBedrockResponse(fakeEmbedding));

      const result = await service.generateEmbedding('Texto de prueba');

      expect(result).toHaveLength(1024);
      expect(result).toEqual(fakeEmbedding);
    });

    it('debe enviar el request body correcto a Bedrock (inputText, dimensions, normalize)', async () => {
      const fakeEmbedding = createFakeEmbedding(1024);
      mockSend.mockResolvedValueOnce(createBedrockResponse(fakeEmbedding));

      const { InvokeModelCommand } = await import(
        '@aws-sdk/client-bedrock-runtime'
      );

      await service.generateEmbedding('Contenido del documento');

      expect(InvokeModelCommand).toHaveBeenCalledWith({
        modelId: 'amazon.titan-embed-text-v2:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: 'Contenido del documento',
          dimensions: 1024,
          normalize: true,
        }),
      });
    });

    it('debe lanzar error cuando Bedrock retorna un error transitorio', async () => {
      const bedrockError = new Error(
        'ThrottlingException: Rate exceeded',
      );
      bedrockError.name = 'ThrottlingException';
      mockSend.mockRejectedValueOnce(bedrockError);

      await expect(
        service.generateEmbedding('Texto de prueba'),
      ).rejects.toThrow('ThrottlingException: Rate exceeded');
    });
  });

  // ─── generateEmbeddings (batch) ────────────────────────────────────────────

  describe('generateEmbeddings', () => {
    it('debe procesar textos en batches de 5 (12 textos = 3 batches: 5+5+2)', async () => {
      const fakeEmbedding = createFakeEmbedding(1024);
      // 12 textos → 12 llamadas a send, pero en 3 batches secuenciales
      mockSend.mockResolvedValue(createBedrockResponse(fakeEmbedding));

      const texts = Array.from({ length: 12 }, (_, i) => `Texto ${i + 1}`);

      const results = await service.generateEmbeddings(texts);

      // Debe haber exactamente 12 llamadas a send (una por texto)
      expect(mockSend).toHaveBeenCalledTimes(12);
      expect(results).toHaveLength(12);
    });

    it('debe retornar la cantidad correcta de embeddings igual al input', async () => {
      const fakeEmbedding = createFakeEmbedding(1024);
      mockSend.mockResolvedValue(createBedrockResponse(fakeEmbedding));

      const texts = ['Texto 1', 'Texto 2', 'Texto 3'];

      const results = await service.generateEmbeddings(texts);

      expect(results).toHaveLength(3);
      results.forEach((embedding) => {
        expect(embedding).toHaveLength(1024);
        expect(embedding).toEqual(fakeEmbedding);
      });
    });

    it('debe procesar exactamente 1 batch cuando hay 5 o menos textos', async () => {
      const fakeEmbedding = createFakeEmbedding(1024);
      mockSend.mockResolvedValue(createBedrockResponse(fakeEmbedding));

      const texts = ['A', 'B', 'C', 'D', 'E'];

      const results = await service.generateEmbeddings(texts);

      expect(mockSend).toHaveBeenCalledTimes(5);
      expect(results).toHaveLength(5);
    });

    it('debe retornar array vacío para input vacío', async () => {
      const results = await service.generateEmbeddings([]);

      expect(results).toHaveLength(0);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('debe propagar error de Bedrock cuando falla un texto del batch', async () => {
      const fakeEmbedding = createFakeEmbedding(1024);
      mockSend
        .mockResolvedValueOnce(createBedrockResponse(fakeEmbedding))
        .mockRejectedValueOnce(
          new Error('ServiceUnavailableException: Service is temporarily unavailable'),
        );

      const texts = ['Texto 1', 'Texto 2'];

      await expect(service.generateEmbeddings(texts)).rejects.toThrow(
        'ServiceUnavailableException',
      );
    });
  });
});
