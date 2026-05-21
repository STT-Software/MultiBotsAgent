/**
 * Unit tests para el handler de indexación de documentos.
 *
 * Verifica el pipeline completo de procesamiento con mocks de todas las dependencias externas:
 * S3Client, MongoClient, BedrockEmbeddingService, ChunkingService y TextExtractor.
 *
 * Valida: Requisitos 3.4, 3.5, 5.2, 5.3, 11.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SQSEvent } from 'aws-lambda';
import type { IndexationMessage } from '@multibotagents/types';

// ─── Mocks de dependencias externas ──────────────────────────────────────────

// Mock de S3Client
const mockS3Send = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

// Mock de MongoClient y repositorios
const mockUpdateProgress = vi.fn();
const mockUpdateStatus = vi.fn();
const mockBulkCreate = vi.fn();
const mockConnect = vi.fn();
const mockDb = vi.fn();

vi.mock('mongodb', () => ({
  MongoClient: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    db: mockDb,
  })),
}));

vi.mock('@multibotagents/db', () => ({
  KnowledgeSourceRepository: vi.fn().mockImplementation(() => ({
    updateProgress: mockUpdateProgress,
    updateStatus: mockUpdateStatus,
  })),
  KnowledgeFragmentRepository: vi.fn().mockImplementation(() => ({
    bulkCreate: mockBulkCreate,
  })),
}));

// Mock de @multibotagents/core
const mockExtract = vi.fn();
vi.mock('@multibotagents/core', () => {
  class TextExtractionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TextExtractionError';
    }
  }

  return {
    ChunkingService: vi.fn().mockImplementation(() => ({
      chunkPlainText: vi.fn().mockReturnValue([
        { content: 'Fragmento 1 con contenido suficiente', position: 0, tokenCount: 100, metadata: { section: undefined, page: undefined } },
        { content: 'Fragmento 2 con más contenido', position: 1, tokenCount: 80, metadata: { section: undefined, page: undefined } },
      ]),
      chunkMarkdown: vi.fn().mockReturnValue([
        { content: '# Título\nContenido de la sección', position: 0, tokenCount: 120, metadata: { section: 'Título', page: undefined } },
      ]),
    })),
    getExtractor: vi.fn().mockReturnValue({ extract: mockExtract }),
    TextExtractionError,
  };
});

// Mock del EmbeddingService
const mockGenerateEmbedding = vi.fn();
vi.mock('../services/embedding.service', () => ({
  BedrockEmbeddingService: vi.fn().mockImplementation(() => ({
    generateEmbedding: mockGenerateEmbedding,
  })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Crea un evento SQS fake con un IndexationMessage en el body.
 */
function createSQSEvent(message: IndexationMessage): SQSEvent {
  return {
    Records: [
      {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify(message),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '1234567890',
          SenderId: 'test-sender',
          ApproximateFirstReceiveTimestamp: '1234567890',
        },
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:indexation-queue',
        awsRegion: 'us-east-1',
      },
    ],
  };
}

/**
 * Crea un IndexationMessage de prueba con valores por defecto.
 */
function createTestMessage(overrides?: Partial<IndexationMessage>): IndexationMessage {
  return {
    sourceId: '507f1f77bcf86cd799439011',
    agentId: 'agent-123',
    companyId: 'company-456',
    s3Key: 'company-456/agent-123/507f1f77bcf86cd799439011/documento.txt',
    format: 'txt',
    title: 'Documento de prueba',
    ...overrides,
  };
}

/**
 * Genera un vector fake de embedding de 1024 dimensiones.
 */
function createFakeEmbedding(): number[] {
  return Array.from({ length: 1024 }, (_, i) => i * 0.001);
}

/**
 * Crea una respuesta mock de S3 GetObject con contenido de texto.
 */
function createS3Response(content: string) {
  return {
    Body: {
      transformToByteArray: vi.fn().mockResolvedValue(
        new TextEncoder().encode(content),
      ),
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('indexation.handler', () => {
  let handler: (event: SQSEvent) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Configurar env vars necesarias
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.KNOWLEDGE_BUCKET = 'test-knowledge-bucket';
    process.env.AWS_REGION = 'us-east-1';

    // Configurar mock de MongoClient.db()
    mockDb.mockReturnValue({});
    mockConnect.mockResolvedValue(undefined);

    // Configurar mock de bulkCreate para retornar los fragmentos creados
    mockBulkCreate.mockResolvedValue([]);

    // Configurar mock de updateProgress y updateStatus
    mockUpdateProgress.mockResolvedValue(undefined);
    mockUpdateStatus.mockResolvedValue({});

    // Importar handler fresco (resetea el estado del módulo)
    vi.resetModules();

    // Re-aplicar mocks después de resetModules
    vi.doMock('@aws-sdk/client-s3', () => ({
      S3Client: vi.fn().mockImplementation(() => ({
        send: mockS3Send,
      })),
      GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    }));

    vi.doMock('mongodb', () => ({
      MongoClient: vi.fn().mockImplementation(() => ({
        connect: mockConnect,
        db: mockDb,
      })),
    }));

    vi.doMock('@multibotagents/db', () => ({
      KnowledgeSourceRepository: vi.fn().mockImplementation(() => ({
        updateProgress: mockUpdateProgress,
        updateStatus: mockUpdateStatus,
      })),
      KnowledgeFragmentRepository: vi.fn().mockImplementation(() => ({
        bulkCreate: mockBulkCreate,
      })),
    }));

    vi.doMock('@multibotagents/core', () => {
      class TextExtractionError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'TextExtractionError';
        }
      }

      return {
        ChunkingService: vi.fn().mockImplementation(() => ({
          chunkPlainText: vi.fn().mockReturnValue([
            { content: 'Fragmento 1 con contenido suficiente', position: 0, tokenCount: 100, metadata: { section: undefined, page: undefined } },
            { content: 'Fragmento 2 con más contenido', position: 1, tokenCount: 80, metadata: { section: undefined, page: undefined } },
          ]),
          chunkMarkdown: vi.fn().mockReturnValue([
            { content: '# Título\nContenido de la sección', position: 0, tokenCount: 120, metadata: { section: 'Título', page: undefined } },
          ]),
        })),
        getExtractor: vi.fn().mockReturnValue({ extract: mockExtract }),
        TextExtractionError,
      };
    });

    vi.doMock('../services/embedding.service', () => ({
      BedrockEmbeddingService: vi.fn().mockImplementation(() => ({
        generateEmbedding: mockGenerateEmbedding,
      })),
    }));

    const module = await import('../indexation.handler');
    handler = module.handler;
  });

  // ─── Flujo exitoso end-to-end ────────────────────────────────────────────

  describe('flujo exitoso end-to-end', () => {
    it('debe procesar un documento TXT completo: descargar → extraer → chunk → embed → almacenar → estado "indexed"', async () => {
      const message = createTestMessage();
      const event = createSQSEvent(message);
      const fakeEmbedding = createFakeEmbedding();

      // Mock S3: descarga exitosa
      mockS3Send.mockResolvedValue(createS3Response('Contenido del documento de prueba con texto suficiente para chunking.'));

      // Mock extractor: extracción exitosa
      mockExtract.mockResolvedValue({
        text: 'Contenido del documento de prueba con texto suficiente para chunking.',
        metadata: { format: 'txt' },
      });

      // Mock embedding: generación exitosa para cada fragmento
      mockGenerateEmbedding.mockResolvedValue(fakeEmbedding);

      await handler(event);

      // Verificar que se actualizó el progreso en orden
      expect(mockUpdateProgress).toHaveBeenCalledWith(message.sourceId, 'extracting');
      expect(mockUpdateProgress).toHaveBeenCalledWith(message.sourceId, 'chunking');
      expect(mockUpdateProgress).toHaveBeenCalledWith(message.sourceId, 'embedding');
      expect(mockUpdateProgress).toHaveBeenCalledWith(message.sourceId, 'storing');

      // Verificar que se almacenaron los fragmentos
      expect(mockBulkCreate).toHaveBeenCalledTimes(1);
      const fragments = mockBulkCreate.mock.calls[0][0];
      expect(fragments).toHaveLength(2);
      expect(fragments[0].agentId).toBe(message.agentId);
      expect(fragments[0].sourceId).toBe(message.sourceId);
      expect(fragments[0].embedding).toEqual(fakeEmbedding);

      // Verificar estado final: "indexed"
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        message.sourceId,
        'indexed',
        expect.objectContaining({
          fragmentCount: 2,
          processedAt: expect.any(Date),
        }),
      );
    });
  });

  // ─── Error en extracción → estado "failed" ──────────────────────────────

  describe('error en extracción de texto', () => {
    it('debe marcar como "failed" cuando el extractor lanza TextExtractionError (archivo corrupto)', async () => {
      const message = createTestMessage({ format: 'pdf' });
      const event = createSQSEvent(message);

      // Mock S3: descarga exitosa
      mockS3Send.mockResolvedValue(createS3Response('contenido binario corrupto'));

      // Mock extractor: lanza TextExtractionError
      const { TextExtractionError } = await import('@multibotagents/core');
      mockExtract.mockRejectedValue(
        new TextExtractionError('Error al extraer texto del PDF: archivo corrupto o formato no soportado'),
      );

      await handler(event);

      // Verificar que se actualizó progreso a "extracting" antes del error
      expect(mockUpdateProgress).toHaveBeenCalledWith(message.sourceId, 'extracting');

      // Verificar que se marcó como "failed" con errorReason
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        message.sourceId,
        'failed',
        expect.objectContaining({
          errorReason: expect.stringContaining('Error al extraer texto del PDF'),
        }),
      );

      // Verificar que NO se almacenaron fragmentos
      expect(mockBulkCreate).not.toHaveBeenCalled();
    });
  });

  // ─── Texto vacío → estado "failed" ──────────────────────────────────────

  describe('texto vacío después de extracción', () => {
    it('debe marcar como "failed" cuando el texto extraído está vacío', async () => {
      const message = createTestMessage();
      const event = createSQSEvent(message);

      // Mock S3: descarga exitosa
      mockS3Send.mockResolvedValue(createS3Response(''));

      // Mock extractor: retorna texto vacío
      mockExtract.mockResolvedValue({
        text: '',
        metadata: { format: 'txt' },
      });

      await handler(event);

      // Verificar que se marcó como "failed" con razón descriptiva
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        message.sourceId,
        'failed',
        expect.objectContaining({
          errorReason: 'No se pudo extraer texto del documento',
        }),
      );

      // Verificar que NO se continuó con chunking ni embeddings
      expect(mockUpdateProgress).not.toHaveBeenCalledWith(message.sourceId, 'chunking');
      expect(mockBulkCreate).not.toHaveBeenCalled();
    });

    it('debe marcar como "failed" cuando el texto extraído contiene solo whitespace', async () => {
      const message = createTestMessage();
      const event = createSQSEvent(message);

      // Mock S3: descarga exitosa
      mockS3Send.mockResolvedValue(createS3Response('   \n\t\n   '));

      // Mock extractor: retorna texto con solo whitespace
      mockExtract.mockResolvedValue({
        text: '   \n\t\n   ',
        metadata: { format: 'txt' },
      });

      await handler(event);

      // Verificar que se marcó como "failed"
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        message.sourceId,
        'failed',
        expect.objectContaining({
          errorReason: 'No se pudo extraer texto del documento',
        }),
      );

      expect(mockBulkCreate).not.toHaveBeenCalled();
    });
  });

  // ─── Error parcial en embeddings → estado "partial" ──────────────────────

  describe('error parcial en embeddings', () => {
    it('debe marcar como "partial" cuando algunos fragmentos fallan en embedding pero otros son exitosos', async () => {
      const message = createTestMessage();
      const event = createSQSEvent(message);
      const fakeEmbedding = createFakeEmbedding();

      // Mock S3: descarga exitosa
      mockS3Send.mockResolvedValue(createS3Response('Contenido válido para procesamiento.'));

      // Mock extractor: extracción exitosa
      mockExtract.mockResolvedValue({
        text: 'Contenido válido para procesamiento.',
        metadata: { format: 'txt' },
      });

      // Mock embedding: primer fragmento exitoso, segundo falla
      mockGenerateEmbedding
        .mockResolvedValueOnce(fakeEmbedding)
        .mockRejectedValueOnce(new Error('ThrottlingException: Rate exceeded'));

      await handler(event);

      // Verificar que se almacenaron solo los fragmentos exitosos
      expect(mockBulkCreate).toHaveBeenCalledTimes(1);
      const storedFragments = mockBulkCreate.mock.calls[0][0];
      expect(storedFragments).toHaveLength(1);
      expect(storedFragments[0].embedding).toEqual(fakeEmbedding);

      // Verificar estado "partial" con información del error
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        message.sourceId,
        'partial',
        expect.objectContaining({
          fragmentCount: 1,
          processedAt: expect.any(Date),
          errorReason: expect.stringContaining('1 de 2 fragmentos fallaron'),
        }),
      );
    });
  });

  // ─── Actualización de progreso en cada etapa ─────────────────────────────

  describe('actualización de progreso en cada etapa', () => {
    it('debe actualizar el progreso en orden: extracting → chunking → embedding → storing', async () => {
      const message = createTestMessage();
      const event = createSQSEvent(message);
      const fakeEmbedding = createFakeEmbedding();

      // Mock S3: descarga exitosa
      mockS3Send.mockResolvedValue(createS3Response('Texto de prueba.'));

      // Mock extractor: extracción exitosa
      mockExtract.mockResolvedValue({
        text: 'Texto de prueba.',
        metadata: { format: 'txt' },
      });

      // Mock embedding: generación exitosa
      mockGenerateEmbedding.mockResolvedValue(fakeEmbedding);

      // Capturar el orden de las llamadas a updateProgress
      const progressCalls: string[] = [];
      mockUpdateProgress.mockImplementation((_id: string, progress: string) => {
        progressCalls.push(progress);
        return Promise.resolve();
      });

      await handler(event);

      // Verificar que las etapas se ejecutaron en el orden correcto
      const uniqueStages = [...new Set(progressCalls)];
      expect(uniqueStages[0]).toBe('extracting');
      expect(uniqueStages[1]).toBe('chunking');
      expect(uniqueStages[2]).toBe('embedding');
      expect(uniqueStages[3]).toBe('storing');
    });

    it('debe llamar updateProgress al menos una vez por cada etapa del pipeline', async () => {
      const message = createTestMessage();
      const event = createSQSEvent(message);
      const fakeEmbedding = createFakeEmbedding();

      // Mock S3: descarga exitosa
      mockS3Send.mockResolvedValue(createS3Response('Texto de prueba.'));

      // Mock extractor: extracción exitosa
      mockExtract.mockResolvedValue({
        text: 'Texto de prueba.',
        metadata: { format: 'txt' },
      });

      // Mock embedding: generación exitosa
      mockGenerateEmbedding.mockResolvedValue(fakeEmbedding);

      await handler(event);

      // Verificar que se llamó updateProgress para cada etapa
      expect(mockUpdateProgress).toHaveBeenCalledWith(message.sourceId, 'extracting');
      expect(mockUpdateProgress).toHaveBeenCalledWith(message.sourceId, 'chunking');
      expect(mockUpdateProgress).toHaveBeenCalledWith(message.sourceId, 'embedding');
      expect(mockUpdateProgress).toHaveBeenCalledWith(message.sourceId, 'storing');
    });
  });

  // ─── Errores que deben propagarse para reintento SQS ─────────────────────

  describe('errores que se propagan para reintento', () => {
    it('debe propagar errores no-TextExtractionError para que SQS reintente', async () => {
      const message = createTestMessage();
      const event = createSQSEvent(message);

      // Mock S3: falla la descarga (error transitorio)
      mockS3Send.mockRejectedValue(new Error('NetworkingError: Connection reset'));

      await expect(handler(event)).rejects.toThrow('NetworkingError');

      // Verificar que NO se marcó como "failed" (SQS reintentará)
      expect(mockUpdateStatus).not.toHaveBeenCalledWith(
        message.sourceId,
        'failed',
        expect.anything(),
      );
    });

    it('debe propagar error cuando todos los embeddings fallan (servicio no disponible)', async () => {
      const message = createTestMessage();
      const event = createSQSEvent(message);

      // Mock S3: descarga exitosa
      mockS3Send.mockResolvedValue(createS3Response('Texto válido.'));

      // Mock extractor: extracción exitosa
      mockExtract.mockResolvedValue({
        text: 'Texto válido.',
        metadata: { format: 'txt' },
      });

      // Mock embedding: TODOS los fragmentos fallan
      mockGenerateEmbedding.mockRejectedValue(
        new Error('ServiceUnavailableException: Bedrock no disponible'),
      );

      await expect(handler(event)).rejects.toThrow(
        'El servicio de embeddings no está disponible',
      );
    });
  });
});
