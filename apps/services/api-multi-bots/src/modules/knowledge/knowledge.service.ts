import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import type { KnowledgeSource, IndexationMessage } from '@multibotagents/types';
import type { IKnowledgeSourceRepository, IKnowledgeFragmentRepository } from '@multibotagents/db';

import {
  KNOWLEDGE_SOURCE_REPOSITORY,
  KNOWLEDGE_FRAGMENT_REPOSITORY,
  S3_CLIENT,
  SQS_CLIENT,
} from './constants';

// ─── Constantes de validación ────────────────────────────────────────────────

/** Formatos de archivo soportados en el MVP */
const SUPPORTED_FORMATS = ['pdf', 'txt', 'md'] as const;

/** Tamaño máximo de archivo: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Timeout de procesamiento: 5 minutos en milisegundos */
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Servicio de gestión de la base de conocimiento.
 * Orquesta validación, persistencia en MongoDB, almacenamiento en S3
 * y disparo del pipeline de indexación vía SQS.
 *
 * Valida: Requisitos 1.1–1.7, 2.1–2.5, 8.1–8.6, 9.1–9.4, 10.1–10.3, 11.3
 */
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly bucketName: string;
  private readonly queueUrl: string;

  constructor(
    @Inject(KNOWLEDGE_SOURCE_REPOSITORY) private readonly sourceRepo: IKnowledgeSourceRepository,
    @Inject(KNOWLEDGE_FRAGMENT_REPOSITORY) private readonly fragmentRepo: IKnowledgeFragmentRepository,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    @Inject(SQS_CLIENT) private readonly sqsClient: SQSClient,
  ) {
    this.bucketName = process.env.KNOWLEDGE_BUCKET ?? '';
    this.queueUrl = process.env.INDEXATION_QUEUE_URL ?? '';
  }

  /**
   * Sube un archivo a la base de conocimiento de un agente.
   * Valida formato, tamaño y existencia del agente → crea KnowledgeSource → sube a S3 → dispara indexación.
   *
   * Valida: Requisitos 1.1–1.7
   */
  async uploadFile(
    agentId: string,
    companyId: string,
    file: Buffer,
    filename: string,
    metadata?: { title?: string; category?: string },
  ): Promise<KnowledgeSource> {
    // 1. Validar formato
    const format = this.extractFormat(filename);
    if (!format) {
      throw new BadRequestException(
        `Formato no soportado. Los formatos válidos son: ${SUPPORTED_FORMATS.join(', ')}`,
      );
    }

    // 2. Validar tamaño
    if (file.length > MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        `El archivo excede el tamaño máximo permitido de 10 MB.`,
      );
    }

    // 3. Crear KnowledgeSource con estado "processing"
    const title = metadata?.title ?? filename;
    const source = await this.sourceRepo.create({
      agentId,
      companyId,
      title,
      type: 'file',
      format,
      originalFileKey: '', // Se actualiza después de generar el sourceId
      fileSizeBytes: file.length,
      status: 'processing',
      progress: 'extracting',
      fragmentCount: 0,
      metadata: {
        category: metadata?.category,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Generar S3 key y subir archivo
    const s3Key = `${companyId}/${agentId}/${source.id}/${filename}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: file,
        }),
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error al subir archivo a S3', {
        sourceId: source.id,
        s3Key,
        error: errorMessage,
      });
      // Limpiar el registro creado si falla la subida
      await this.sourceRepo.delete(source.id);
      throw error;
    }

    // 5. Actualizar la key en el registro
    const updatedSource = await this.sourceRepo.update(source.id, {
      originalFileKey: s3Key,
    });

    // 6. Enviar mensaje a SQS para procesamiento
    await this.sendIndexationMessage({
      sourceId: source.id,
      agentId,
      companyId,
      s3Key,
      format,
      title,
    });

    this.logger.log('Archivo subido exitosamente', {
      sourceId: updatedSource.id,
      agentId,
      format,
      sizeBytes: file.length,
    });

    return updatedSource;
  }

  /**
   * Crea contenido textual directamente en la base de conocimiento.
   * Valida texto no vacío y tamaño → crea KnowledgeSource tipo "text" → almacena como .md en S3 → dispara indexación.
   *
   * Valida: Requisitos 2.1–2.5
   */
  async createTextContent(
    agentId: string,
    companyId: string,
    title: string,
    content: string,
  ): Promise<KnowledgeSource> {
    // 1. Validar que el texto no esté vacío
    if (!content || content.trim().length === 0) {
      throw new BadRequestException(
        'El contenido no puede estar vacío.',
      );
    }

    // 2. Validar tamaño del contenido
    const contentBuffer = Buffer.from(content, 'utf-8');
    if (contentBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        'El contenido excede el tamaño máximo permitido de 10 MB.',
      );
    }

    // 3. Crear KnowledgeSource con tipo "text"
    const source = await this.sourceRepo.create({
      agentId,
      companyId,
      title,
      type: 'text',
      format: 'md',
      originalFileKey: '', // Se actualiza después
      fileSizeBytes: contentBuffer.length,
      status: 'processing',
      progress: 'extracting',
      fragmentCount: 0,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Almacenar como archivo .md en S3
    const filename = `${this.sanitizeFilename(title)}.md`;
    const s3Key = `${companyId}/${agentId}/${source.id}/${filename}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: contentBuffer,
          ContentType: 'text/markdown; charset=utf-8',
        }),
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error al almacenar contenido textual en S3', {
        sourceId: source.id,
        s3Key,
        error: errorMessage,
      });
      await this.sourceRepo.delete(source.id);
      throw error;
    }

    // 5. Actualizar la key en el registro
    const updatedSource = await this.sourceRepo.update(source.id, {
      originalFileKey: s3Key,
    });

    // 6. Enviar mensaje a SQS para procesamiento
    await this.sendIndexationMessage({
      sourceId: source.id,
      agentId,
      companyId,
      s3Key,
      format: 'md',
      title,
    });

    this.logger.log('Contenido textual creado exitosamente', {
      sourceId: updatedSource.id,
      agentId,
      sizeBytes: contentBuffer.length,
    });

    return updatedSource;
  }

  /**
   * Elimina una fuente de conocimiento y todos sus recursos asociados.
   * Valida existencia → elimina fragments → elimina archivo S3 → elimina KnowledgeSource.
   *
   * Valida: Requisitos 8.1–8.6
   */
  async deleteSource(sourceId: string): Promise<void> {
    // 1. Validar existencia
    const source = await this.sourceRepo.findById(sourceId);
    if (!source) {
      throw new NotFoundException(
        `La fuente de conocimiento con id "${sourceId}" no fue encontrada.`,
      );
    }

    // 2. Eliminar todos los fragmentos asociados
    const deletedCount = await this.fragmentRepo.deleteBySourceId(sourceId);
    this.logger.debug('Fragmentos eliminados', { sourceId, deletedCount });

    // 3. Eliminar archivo de S3
    if (source.originalFileKey) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: source.originalFileKey,
          }),
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn('Error al eliminar archivo de S3 (continuando con eliminación)', {
          sourceId,
          s3Key: source.originalFileKey,
          error: errorMessage,
        });
      }
    }

    // 4. Eliminar el registro KnowledgeSource
    await this.sourceRepo.delete(sourceId);

    this.logger.log('Fuente de conocimiento eliminada', {
      sourceId,
      agentId: source.agentId,
      fragmentsDeleted: deletedCount,
    });
  }

  /**
   * Re-procesa una fuente de conocimiento existente.
   * Valida existencia → elimina fragments → actualiza estado a "processing" → envía mensaje SQS.
   *
   * Valida: Requisitos 9.1–9.4
   */
  async reprocessSource(sourceId: string): Promise<KnowledgeSource> {
    // 1. Validar existencia
    const source = await this.sourceRepo.findById(sourceId);
    if (!source) {
      throw new NotFoundException(
        `La fuente de conocimiento con id "${sourceId}" no fue encontrada.`,
      );
    }

    // 2. Validar que tiene archivo en S3
    if (!source.originalFileKey) {
      throw new NotFoundException(
        `La fuente de conocimiento no tiene archivo asociado en S3.`,
      );
    }

    // 3. Eliminar fragmentos existentes
    const deletedCount = await this.fragmentRepo.deleteBySourceId(sourceId);
    this.logger.debug('Fragmentos eliminados para re-procesamiento', {
      sourceId,
      deletedCount,
    });

    // 4. Actualizar estado a "processing"
    const updatedSource = await this.sourceRepo.updateStatus(sourceId, 'processing', {
      progress: 'extracting',
      fragmentCount: 0,
      errorReason: undefined,
      processedAt: undefined,
    });

    // 5. Enviar mensaje a SQS
    await this.sendIndexationMessage({
      sourceId: source.id,
      agentId: source.agentId,
      companyId: source.companyId,
      s3Key: source.originalFileKey,
      format: source.format,
      title: source.title,
    });

    this.logger.log('Re-procesamiento iniciado', {
      sourceId,
      agentId: source.agentId,
    });

    return updatedSource;
  }

  /**
   * Retorna todas las fuentes de conocimiento de un agente.
   *
   * Valida: Requisito 10.1
   */
  async getSourcesByAgent(agentId: string): Promise<KnowledgeSource[]> {
    return this.sourceRepo.findByAgentId(agentId);
  }

  /**
   * Retorna el estado de una fuente específica con detección de timeout.
   * Si la fuente lleva más de 5 minutos en "processing", se marca como "failed".
   *
   * Valida: Requisitos 10.2, 11.3
   */
  async getSourceStatus(sourceId: string): Promise<KnowledgeSource> {
    const source = await this.sourceRepo.findById(sourceId);
    if (!source) {
      throw new NotFoundException(
        `La fuente de conocimiento con id "${sourceId}" no fue encontrada.`,
      );
    }

    // Detección de timeout: si lleva > 5 min en "processing"
    if (source.status === 'processing') {
      const elapsed = Date.now() - new Date(source.updatedAt).getTime();
      if (elapsed > PROCESSING_TIMEOUT_MS) {
        this.logger.warn('Timeout detectado en procesamiento', {
          sourceId,
          elapsedMs: elapsed,
        });

        const failedSource = await this.sourceRepo.updateStatus(sourceId, 'failed', {
          errorReason: 'timeout: el procesamiento excedió el tiempo máximo',
        });

        return failedSource;
      }
    }

    return source;
  }

  // ─── Métodos privados ──────────────────────────────────────────────────────

  /**
   * Extrae y valida el formato del archivo a partir de su nombre.
   * Retorna el formato si es soportado, o null si no lo es.
   */
  private extractFormat(filename: string): 'pdf' | 'txt' | 'md' | null {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (!extension) return null;
    if (SUPPORTED_FORMATS.includes(extension as typeof SUPPORTED_FORMATS[number])) {
      return extension as 'pdf' | 'txt' | 'md';
    }
    return null;
  }

  /**
   * Sanitiza un título para usarlo como nombre de archivo.
   * Remueve caracteres especiales y limita la longitud.
   */
  private sanitizeFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);
  }

  /**
   * Envía un mensaje de indexación a la cola SQS.
   */
  private async sendIndexationMessage(message: IndexationMessage): Promise<void> {
    try {
      await this.sqsClient.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(message),
        }),
      );
      this.logger.debug('Mensaje de indexación enviado a SQS', {
        sourceId: message.sourceId,
        queueUrl: this.queueUrl,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error al enviar mensaje a SQS', {
        sourceId: message.sourceId,
        error: errorMessage,
      });
      throw error;
    }
  }
}
