import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { KnowledgeService } from '../knowledge.service';
import type { KnowledgeSource } from '@multibotagents/types';
import type { IKnowledgeSourceRepository, IKnowledgeFragmentRepository } from '@multibotagents/db';

/**
 * Unit tests para KnowledgeService.
 * Valida la orquestación de validación, persistencia en MongoDB,
 * almacenamiento en S3 y disparo del pipeline de indexación vía SQS.
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.6, 8.3, 8.4, 8.5, 9.1, 9.2, 11.3**
 */

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_SOURCE_ID = 'source-001';
const MOCK_AGENT_ID = 'agent-001';
const MOCK_COMPANY_ID = 'company-001';

const createMockSource = (overrides?: Partial<KnowledgeSource>): KnowledgeSource => ({
  id: MOCK_SOURCE_ID,
  agentId: MOCK_AGENT_ID,
  companyId: MOCK_COMPANY_ID,
  title: 'documento-test.pdf',
  type: 'file',
  format: 'pdf',
  originalFileKey: `${MOCK_COMPANY_ID}/${MOCK_AGENT_ID}/${MOCK_SOURCE_ID}/documento-test.pdf`,
  fileSizeBytes: 1024,
  status: 'processing',
  progress: 'extracting',
  fragmentCount: 0,
  metadata: {},
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  ...overrides,
});

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockSourceRepo(): IKnowledgeSourceRepository {
  return {
    create: vi.fn().mockResolvedValue(createMockSource()),
    findById: vi.fn().mockResolvedValue(createMockSource()),
    findByAgentId: vi.fn().mockResolvedValue([createMockSource()]),
    update: vi.fn().mockImplementation((_id, data) =>
      Promise.resolve(createMockSource(data)),
    ),
    updateStatus: vi.fn().mockImplementation((_id, status, extra) =>
      Promise.resolve(createMockSource({ status, ...extra })),
    ),
    updateProgress: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    findAll: vi.fn().mockResolvedValue([]),
  } as unknown as IKnowledgeSourceRepository;
}

function createMockFragmentRepo(): IKnowledgeFragmentRepository {
  return {
    deleteBySourceId: vi.fn().mockResolvedValue(5),
    findBySourceId: vi.fn().mockResolvedValue([]),
    bulkCreate: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(true),
  } as unknown as IKnowledgeFragmentRepository;
}

function createMockS3Client() {
  return {
    send: vi.fn().mockResolvedValue({}),
  };
}

function createMockSqsClient() {
  return {
    send: vi.fn().mockResolvedValue({}),
  };
}

function createService(overrides?: {
  sourceRepo?: IKnowledgeSourceRepository;
  fragmentRepo?: IKnowledgeFragmentRepository;
  s3Client?: ReturnType<typeof createMockS3Client>;
  sqsClient?: ReturnType<typeof createMockSqsClient>;
}) {
  const sourceRepo = overrides?.sourceRepo ?? createMockSourceRepo();
  const fragmentRepo = overrides?.fragmentRepo ?? createMockFragmentRepo();
  const s3Client = overrides?.s3Client ?? createMockS3Client();
  const sqsClient = overrides?.sqsClient ?? createMockSqsClient();

  // Configurar variables de entorno necesarias
  process.env.KNOWLEDGE_BUCKET = 'test-bucket';
  process.env.INDEXATION_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';

  const service = new KnowledgeService(
    sourceRepo as unknown as IKnowledgeSourceRepository,
    fragmentRepo as unknown as IKnowledgeFragmentRepository,
    s3Client as any,
    sqsClient as any,
  );

  return { service, sourceRepo, fragmentRepo, s3Client, sqsClient };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('KnowledgeService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Validación de formato (Req 1.2) ────────────────────────────────────────

  describe('uploadFile - Validación de formato', () => {
    it('debe rechazar archivo .docx con BadRequestException', async () => {
      const { service } = createService();
      const file = Buffer.from('contenido de prueba');

      await expect(
        service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'documento.docx'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar archivo .xlsx con BadRequestException', async () => {
      const { service } = createService();
      const file = Buffer.from('contenido de prueba');

      await expect(
        service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'datos.xlsx'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar archivo .jpg con BadRequestException', async () => {
      const { service } = createService();
      const file = Buffer.from('contenido de prueba');

      await expect(
        service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'imagen.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe incluir formatos válidos en el mensaje de error', async () => {
      const { service } = createService();
      const file = Buffer.from('contenido de prueba');

      try {
        await service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'archivo.docx');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const message = (error as BadRequestException).message;
        expect(message).toContain('pdf');
        expect(message).toContain('txt');
        expect(message).toContain('md');
      }
    });

    it('debe aceptar archivo .pdf sin lanzar excepción de formato', async () => {
      const { service } = createService();
      const file = Buffer.from('contenido pdf');

      await expect(
        service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'documento.pdf'),
      ).resolves.toBeDefined();
    });

    it('debe aceptar archivo .txt sin lanzar excepción de formato', async () => {
      const { service } = createService();
      const file = Buffer.from('contenido texto');

      await expect(
        service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'notas.txt'),
      ).resolves.toBeDefined();
    });

    it('debe aceptar archivo .md sin lanzar excepción de formato', async () => {
      const { service } = createService();
      const file = Buffer.from('# Markdown');

      await expect(
        service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'readme.md'),
      ).resolves.toBeDefined();
    });
  });

  // ─── Validación de tamaño (Req 1.3) ────────────────────────────────────────

  describe('uploadFile - Validación de tamaño', () => {
    it('debe rechazar archivo mayor a 10MB con PayloadTooLargeException', async () => {
      const { service } = createService();
      const largeFile = Buffer.alloc(10 * 1024 * 1024 + 1); // 10MB + 1 byte

      await expect(
        service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, largeFile, 'grande.pdf'),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('debe aceptar archivo de exactamente 10MB', async () => {
      const { service } = createService();
      const exactFile = Buffer.alloc(10 * 1024 * 1024); // Exactamente 10MB

      await expect(
        service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, exactFile, 'limite.pdf'),
      ).resolves.toBeDefined();
    });

    it('debe aceptar archivo menor a 10MB', async () => {
      const { service } = createService();
      const smallFile = Buffer.alloc(5 * 1024 * 1024); // 5MB

      await expect(
        service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, smallFile, 'normal.pdf'),
      ).resolves.toBeDefined();
    });
  });

  // ─── Creación exitosa de KnowledgeSource (Req 1.5) ─────────────────────────

  describe('uploadFile - Creación exitosa', () => {
    it('debe crear KnowledgeSource con estado "processing"', async () => {
      const sourceRepo = createMockSourceRepo();
      const { service } = createService({ sourceRepo });
      const file = Buffer.from('contenido pdf');

      await service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'doc.pdf');

      expect(sourceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: MOCK_AGENT_ID,
          companyId: MOCK_COMPANY_ID,
          status: 'processing',
          progress: 'extracting',
          type: 'file',
          format: 'pdf',
        }),
      );
    });

    it('debe usar el filename como título si no se proporciona metadata.title', async () => {
      const sourceRepo = createMockSourceRepo();
      const { service } = createService({ sourceRepo });
      const file = Buffer.from('contenido');

      await service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'mi-archivo.pdf');

      expect(sourceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'mi-archivo.pdf',
        }),
      );
    });

    it('debe usar metadata.title como título cuando se proporciona', async () => {
      const sourceRepo = createMockSourceRepo();
      const { service } = createService({ sourceRepo });
      const file = Buffer.from('contenido');

      await service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'doc.pdf', {
        title: 'Manual de usuario',
      });

      expect(sourceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Manual de usuario',
        }),
      );
    });

    it('debe registrar el tamaño del archivo en fileSizeBytes', async () => {
      const sourceRepo = createMockSourceRepo();
      const { service } = createService({ sourceRepo });
      const file = Buffer.from('contenido de prueba con algo de texto');

      await service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'doc.txt');

      expect(sourceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileSizeBytes: file.length,
        }),
      );
    });
  });

  // ─── Generación correcta de S3 key (Req 1.6) ──────────────────────────────

  describe('uploadFile - Generación de S3 key', () => {
    it('debe generar S3 key con formato {companyId}/{agentId}/{sourceId}/{filename}', async () => {
      const s3Client = createMockS3Client();
      const sourceRepo = createMockSourceRepo();
      const { service } = createService({ sourceRepo, s3Client });
      const file = Buffer.from('contenido');

      await service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'documento.pdf');

      // Verificar que el PutObjectCommand se envió con la key correcta
      expect(s3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Key: `${MOCK_COMPANY_ID}/${MOCK_AGENT_ID}/${MOCK_SOURCE_ID}/documento.pdf`,
            Bucket: 'test-bucket',
          }),
        }),
      );
    });

    it('debe actualizar originalFileKey en el registro después de subir a S3', async () => {
      const sourceRepo = createMockSourceRepo();
      const { service } = createService({ sourceRepo });
      const file = Buffer.from('contenido');

      await service.uploadFile(MOCK_AGENT_ID, MOCK_COMPANY_ID, file, 'archivo.txt');

      expect(sourceRepo.update).toHaveBeenCalledWith(
        MOCK_SOURCE_ID,
        expect.objectContaining({
          originalFileKey: `${MOCK_COMPANY_ID}/${MOCK_AGENT_ID}/${MOCK_SOURCE_ID}/archivo.txt`,
        }),
      );
    });
  });

  // ─── Eliminación en cascada (Req 8.3, 8.4, 8.5) ───────────────────────────

  describe('deleteSource - Eliminación en cascada', () => {
    it('debe eliminar fragmentos → archivo S3 → registro source en ese orden', async () => {
      const sourceRepo = createMockSourceRepo();
      const fragmentRepo = createMockFragmentRepo();
      const s3Client = createMockS3Client();
      const { service } = createService({ sourceRepo, fragmentRepo, s3Client });

      const callOrder: string[] = [];
      (fragmentRepo.deleteBySourceId as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('deleteFragments');
        return 5;
      });
      (s3Client.send as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('deleteS3');
        return {};
      });
      (sourceRepo.delete as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('deleteSource');
        return true;
      });

      await service.deleteSource(MOCK_SOURCE_ID);

      expect(callOrder).toEqual(['deleteFragments', 'deleteS3', 'deleteSource']);
    });

    it('debe eliminar todos los fragmentos por sourceId', async () => {
      const fragmentRepo = createMockFragmentRepo();
      const { service } = createService({ fragmentRepo });

      await service.deleteSource(MOCK_SOURCE_ID);

      expect(fragmentRepo.deleteBySourceId).toHaveBeenCalledWith(MOCK_SOURCE_ID);
    });

    it('debe eliminar el archivo de S3 usando la originalFileKey', async () => {
      const s3Client = createMockS3Client();
      const { service } = createService({ s3Client });

      await service.deleteSource(MOCK_SOURCE_ID);

      expect(s3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Key: `${MOCK_COMPANY_ID}/${MOCK_AGENT_ID}/${MOCK_SOURCE_ID}/documento-test.pdf`,
            Bucket: 'test-bucket',
          }),
        }),
      );
    });

    it('debe eliminar el registro KnowledgeSource', async () => {
      const sourceRepo = createMockSourceRepo();
      const { service } = createService({ sourceRepo });

      await service.deleteSource(MOCK_SOURCE_ID);

      expect(sourceRepo.delete).toHaveBeenCalledWith(MOCK_SOURCE_ID);
    });

    it('debe lanzar NotFoundException si la fuente no existe', async () => {
      const sourceRepo = createMockSourceRepo();
      (sourceRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { service } = createService({ sourceRepo });

      await expect(service.deleteSource('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Re-procesamiento (Req 9.1, 9.2) ──────────────────────────────────────

  describe('reprocessSource - Re-procesamiento', () => {
    it('debe eliminar fragmentos existentes', async () => {
      const fragmentRepo = createMockFragmentRepo();
      const { service } = createService({ fragmentRepo });

      await service.reprocessSource(MOCK_SOURCE_ID);

      expect(fragmentRepo.deleteBySourceId).toHaveBeenCalledWith(MOCK_SOURCE_ID);
    });

    it('debe actualizar estado a "processing" con progress "extracting"', async () => {
      const sourceRepo = createMockSourceRepo();
      const { service } = createService({ sourceRepo });

      await service.reprocessSource(MOCK_SOURCE_ID);

      expect(sourceRepo.updateStatus).toHaveBeenCalledWith(
        MOCK_SOURCE_ID,
        'processing',
        expect.objectContaining({
          progress: 'extracting',
          fragmentCount: 0,
        }),
      );
    });

    it('debe enviar mensaje SQS con datos del source', async () => {
      const sqsClient = createMockSqsClient();
      const { service } = createService({ sqsClient });

      await service.reprocessSource(MOCK_SOURCE_ID);

      expect(sqsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue',
            MessageBody: expect.stringContaining(MOCK_SOURCE_ID),
          }),
        }),
      );
    });

    it('el mensaje SQS debe contener sourceId, agentId, companyId, s3Key, format y title', async () => {
      const sqsClient = createMockSqsClient();
      const { service } = createService({ sqsClient });

      await service.reprocessSource(MOCK_SOURCE_ID);

      const sendCall = (sqsClient.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const messageBody = JSON.parse(sendCall.input.MessageBody);

      expect(messageBody).toEqual(
        expect.objectContaining({
          sourceId: MOCK_SOURCE_ID,
          agentId: MOCK_AGENT_ID,
          companyId: MOCK_COMPANY_ID,
          s3Key: `${MOCK_COMPANY_ID}/${MOCK_AGENT_ID}/${MOCK_SOURCE_ID}/documento-test.pdf`,
          format: 'pdf',
          title: 'documento-test.pdf',
        }),
      );
    });

    it('debe lanzar NotFoundException si la fuente no existe', async () => {
      const sourceRepo = createMockSourceRepo();
      (sourceRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { service } = createService({ sourceRepo });

      await expect(service.reprocessSource('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Detección de timeout en getSourceStatus (Req 11.3) ────────────────────

  describe('getSourceStatus - Detección de timeout', () => {
    it('debe marcar como "failed" si lleva más de 5 minutos en "processing"', async () => {
      const sourceRepo = createMockSourceRepo();
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      (sourceRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSource({
          status: 'processing',
          updatedAt: sixMinutesAgo,
        }),
      );
      const { service } = createService({ sourceRepo });

      await service.getSourceStatus(MOCK_SOURCE_ID);

      expect(sourceRepo.updateStatus).toHaveBeenCalledWith(
        MOCK_SOURCE_ID,
        'failed',
        expect.objectContaining({
          errorReason: expect.stringContaining('timeout'),
        }),
      );
    });

    it('debe retornar el source con status "failed" cuando detecta timeout', async () => {
      const sourceRepo = createMockSourceRepo();
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      (sourceRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSource({
          status: 'processing',
          updatedAt: sixMinutesAgo,
        }),
      );
      (sourceRepo.updateStatus as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSource({
          status: 'failed',
          errorReason: 'timeout: el procesamiento excedió el tiempo máximo',
        }),
      );
      const { service } = createService({ sourceRepo });

      const result = await service.getSourceStatus(MOCK_SOURCE_ID);

      expect(result.status).toBe('failed');
      expect(result.errorReason).toContain('timeout');
    });

    it('debe retornar el source normalmente si lleva menos de 5 minutos en "processing"', async () => {
      const sourceRepo = createMockSourceRepo();
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      (sourceRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSource({
          status: 'processing',
          updatedAt: twoMinutesAgo,
        }),
      );
      const { service } = createService({ sourceRepo });

      const result = await service.getSourceStatus(MOCK_SOURCE_ID);

      expect(result.status).toBe('processing');
      expect(sourceRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('no debe verificar timeout si el estado no es "processing"', async () => {
      const sourceRepo = createMockSourceRepo();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      (sourceRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockSource({
          status: 'indexed',
          updatedAt: tenMinutesAgo,
        }),
      );
      const { service } = createService({ sourceRepo });

      const result = await service.getSourceStatus(MOCK_SOURCE_ID);

      expect(result.status).toBe('indexed');
      expect(sourceRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si la fuente no existe', async () => {
      const sourceRepo = createMockSourceRepo();
      (sourceRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { service } = createService({ sourceRepo });

      await expect(service.getSourceStatus('no-existe')).rejects.toThrow(NotFoundException);
    });
  });
});
