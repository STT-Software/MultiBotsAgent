/**
 * Handler de indexación de documentos — Lambda disparada por SQS.
 *
 * Orquesta el pipeline completo de procesamiento:
 * 1. Descarga archivo de S3
 * 2. Extrae texto según formato
 * 3. Aplica chunking inteligente
 * 4. Genera embeddings vectoriales vía Amazon Titan Embeddings v2
 * 5. Almacena fragmentos en MongoDB
 * 6. Actualiza estado del KnowledgeSource
 *
 * Valida: Requisitos 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 5.1, 5.2, 5.3, 6.1, 6.2, 6.4, 11.5, 11.6
 */

import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient } from 'mongodb';
import type {
  IndexationMessage,
  SupportedFormat,
  KnowledgeFragment,
} from '@multibotagents/types';
import {
  ChunkingService,
  getExtractor,
  TextExtractionError,
} from '@multibotagents/core';
import {
  KnowledgeSourceRepository,
  KnowledgeFragmentRepository,
} from '@multibotagents/db';
import { BedrockEmbeddingService } from './services/embedding.service';

// ─── Logger estructurado ─────────────────────────────────────────────────────

function log(level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG', message: string, data?: Record<string, unknown>) {
  const now = new Date();
  const ts = now.toISOString().replace('T', ' ').substring(0, 19);
  const pad = level.padEnd(5);
  const dataStr = data && Object.keys(data).length > 0
    ? ' ' + JSON.stringify(data)
    : '';
  console.log(`[${ts}] ${pad} [IndexationHandler] ${message}${dataStr}`);
}

// ─── Conexión MongoDB (reutilizada entre invocaciones de Lambda) ─────────────

let mongoClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI no está configurada');
    log('INFO', 'Conectando a MongoDB...');
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    log('INFO', 'Conexión a MongoDB establecida');
  }
  return mongoClient;
}

// ─── Clientes AWS (reutilizados entre invocaciones) ──────────────────────────

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const embeddingService = new BedrockEmbeddingService(
  process.env.AWS_REGION || 'us-east-1',
);
const chunkingService = new ChunkingService();

// ─── Handler principal ───────────────────────────────────────────────────────

export async function handler(event: SQSEvent): Promise<void> {
  log('INFO', `Recibidos ${event.Records.length} mensaje(s) de SQS`);

  for (const record of event.Records) {
    await processRecord(record);
  }

  log('INFO', 'Procesamiento de todos los records completado');
}

// ─── Procesamiento de un record ──────────────────────────────────────────────

async function processRecord(record: SQSRecord): Promise<void> {
  const message: IndexationMessage = JSON.parse(record.body);
  const { sourceId, agentId, companyId, s3Key, format, title } = message;

  log('INFO', '═══ INICIO PIPELINE DE INDEXACIÓN ═══', {
    sourceId,
    agentId,
    companyId,
    s3Key,
    format,
    title,
  });

  const client = await getMongoClient();
  const db = client.db();
  const sourceRepo = new KnowledgeSourceRepository(db);
  const fragmentRepo = new KnowledgeFragmentRepository(db);

  try {
    // ─── PASO 1: Extracting ────────────────────────────────────────────────
    log('INFO', '[1/5] Actualizando progreso → extracting', { sourceId });
    await sourceRepo.updateProgress(sourceId, 'extracting');

    // ─── PASO 2: Descargar de S3 ──────────────────────────────────────────
    log('INFO', '[2/5] Descargando archivo de S3...', { s3Key, bucket: process.env.KNOWLEDGE_BUCKET });
    const fileBuffer = await downloadFromS3(s3Key);
    log('INFO', '[2/5] Archivo descargado exitosamente', { sizeBytes: fileBuffer.length });

    // ─── PASO 3: Extraer texto ────────────────────────────────────────────
    log('INFO', '[3/5] Extrayendo texto del documento...', { format });
    const extractor = getExtractor(format);
    const extractionResult = await extractor.extract(fileBuffer);
    const extractedText = extractionResult.text;

    if (!extractedText || extractedText.trim().length === 0) {
      log('WARN', '[3/5] Texto extraído vacío — marcando como failed', { sourceId });
      await sourceRepo.updateStatus(sourceId, 'failed', {
        errorReason: 'No se pudo extraer texto del documento',
      });
      return;
    }

    log('INFO', '[3/5] Texto extraído exitosamente', {
      textLength: extractedText.length,
      pageCount: extractionResult.metadata.pageCount,
      preview: extractedText.substring(0, 100) + '...',
    });

    // ─── PASO 4: Chunking ─────────────────────────────────────────────────
    log('INFO', '[4/5] Aplicando chunking...', { format });
    await sourceRepo.updateProgress(sourceId, 'chunking');
    const chunks = applyChunking(extractedText, format, sourceId);

    if (chunks.length === 0) {
      log('WARN', '[4/5] Chunking produjo 0 fragmentos — marcando como failed', { sourceId });
      await sourceRepo.updateStatus(sourceId, 'failed', {
        errorReason: 'El chunking no produjo fragmentos válidos',
      });
      return;
    }

    log('INFO', '[4/5] Chunking completado', {
      totalChunks: chunks.length,
      avgTokenCount: Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length),
    });

    // ─── PASO 5: Embeddings ───────────────────────────────────────────────
    log('INFO', '[5/5] Generando embeddings...', { totalChunks: chunks.length });
    await sourceRepo.updateProgress(sourceId, 'embedding');

    const { embeddings, failedIndices } = await generateEmbeddingsWithPartialErrors(
      chunks.map((c) => c.content),
      sourceId,
      sourceRepo,
      chunks.length,
    );

    log('INFO', '[5/5] Embeddings generados', {
      successful: chunks.length - failedIndices.size,
      failed: failedIndices.size,
      total: chunks.length,
    });

    // ─── PASO 6: Almacenar en MongoDB ─────────────────────────────────────
    log('INFO', '[6/6] Almacenando fragmentos en MongoDB...');
    await sourceRepo.updateProgress(sourceId, 'storing');

    const successfulFragments: Omit<KnowledgeFragment, 'id'>[] = [];
    const now = new Date();

    for (let i = 0; i < chunks.length; i++) {
      if (failedIndices.has(i)) continue;

      successfulFragments.push({
        sourceId,
        agentId,
        content: chunks[i].content,
        embedding: embeddings[i],
        position: chunks[i].position,
        tokenCount: chunks[i].tokenCount,
        metadata: {
          section: chunks[i].metadata.section,
          page: extractionResult.metadata.pageCount
            ? chunks[i].metadata.page
            : undefined,
          sourceTitle: title,
        },
        createdAt: now,
      });
    }

    await fragmentRepo.bulkCreate(successfulFragments);
    log('INFO', '[6/6] Fragmentos almacenados en MongoDB', { count: successfulFragments.length });

    // ─── RESULTADO FINAL ──────────────────────────────────────────────────
    if (failedIndices.size > 0) {
      const errorMsg = `${failedIndices.size} de ${chunks.length} fragmentos fallaron en embeddings`;
      log('WARN', '═══ PIPELINE COMPLETADO (PARCIAL) ═══', {
        sourceId,
        status: 'partial',
        fragmentCount: successfulFragments.length,
        errorReason: errorMsg,
      });
      await sourceRepo.updateStatus(sourceId, 'partial', {
        fragmentCount: successfulFragments.length,
        processedAt: now,
        errorReason: errorMsg,
      });
    } else {
      log('INFO', '═══ PIPELINE COMPLETADO (ÉXITO) ═══', {
        sourceId,
        status: 'indexed',
        fragmentCount: successfulFragments.length,
      });
      await sourceRepo.updateStatus(sourceId, 'indexed', {
        fragmentCount: successfulFragments.length,
        processedAt: now,
      });
    }
  } catch (error) {
    if (error instanceof TextExtractionError) {
      log('ERROR', '═══ PIPELINE FALLIDO (extracción) ═══', {
        sourceId,
        error: error.message,
      });
      await sourceRepo.updateStatus(sourceId, 'failed', {
        errorReason: error.message,
      });
      return;
    }

    log('ERROR', '═══ PIPELINE FALLIDO (error inesperado) ═══', {
      sourceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// ─── Funciones auxiliares ────────────────────────────────────────────────────

async function downloadFromS3(s3Key: string): Promise<Buffer> {
  const bucket = process.env.KNOWLEDGE_BUCKET;
  if (!bucket) throw new Error('KNOWLEDGE_BUCKET no está configurada');

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new TextExtractionError(
      'El archivo no se encontró en S3 o está vacío',
    );
  }

  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

function applyChunking(text: string, format: SupportedFormat, sourceId: string) {
  if (format === 'md') {
    return chunkingService.chunkMarkdown(text, sourceId);
  }
  return chunkingService.chunkPlainText(text, sourceId);
}

async function generateEmbeddingsWithPartialErrors(
  texts: string[],
  sourceId: string,
  sourceRepo: KnowledgeSourceRepository,
  totalChunks: number,
): Promise<{ embeddings: number[][]; failedIndices: Set<number> }> {
  const embeddings: number[][] = new Array(texts.length).fill([]);
  const failedIndices = new Set<number>();
  const batchSize = 5;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batchEnd = Math.min(i + batchSize, texts.length);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(texts.length / batchSize);

    log('DEBUG', `Procesando batch de embeddings ${batchNum}/${totalBatches}`, {
      from: i,
      to: batchEnd - 1,
    });

    await sourceRepo.updateProgress(sourceId, 'embedding');

    for (let j = i; j < batchEnd; j++) {
      try {
        const embedding = await embeddingService.generateEmbedding(texts[j]);
        embeddings[j] = embedding;
      } catch (error) {
        log('WARN', `Embedding fallido para fragmento ${j}`, {
          sourceId,
          fragmentIndex: j,
          error: error instanceof Error ? error.message : String(error),
        });
        failedIndices.add(j);
      }
    }
  }

  if (failedIndices.size === texts.length && texts.length > 0) {
    throw new Error(
      `El servicio de embeddings no está disponible: todos los ${totalChunks} fragmentos fallaron`,
    );
  }

  return { embeddings, failedIndices };
}
