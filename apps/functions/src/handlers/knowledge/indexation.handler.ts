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

// ─── Conexión MongoDB (reutilizada entre invocaciones de Lambda) ─────────────

let mongoClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI no está configurada');
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
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

/**
 * Handler SQS que procesa mensajes de indexación.
 * Cada record contiene un IndexationMessage con la información del documento a procesar.
 */
export async function handler(event: SQSEvent): Promise<void> {
  for (const record of event.Records) {
    await processRecord(record);
  }
}

// ─── Procesamiento de un record ──────────────────────────────────────────────

async function processRecord(record: SQSRecord): Promise<void> {
  const message: IndexationMessage = JSON.parse(record.body);
  const { sourceId, agentId, s3Key, format, title } = message;

  const client = await getMongoClient();
  const db = client.db();
  const sourceRepo = new KnowledgeSourceRepository(db);
  const fragmentRepo = new KnowledgeFragmentRepository(db);

  try {
    // 1. Actualizar progreso: "extracting"
    await sourceRepo.updateProgress(sourceId, 'extracting');

    // 2. Descargar archivo de S3
    const fileBuffer = await downloadFromS3(s3Key);

    // 3. Extraer texto según formato
    const extractor = getExtractor(format);
    const extractionResult = await extractor.extract(fileBuffer);
    const extractedText = extractionResult.text;

    // Validar que el texto no esté vacío
    if (!extractedText || extractedText.trim().length === 0) {
      await sourceRepo.updateStatus(sourceId, 'failed', {
        errorReason: 'No se pudo extraer texto del documento',
      });
      return;
    }

    // 4. Actualizar progreso: "chunking"
    await sourceRepo.updateProgress(sourceId, 'chunking');

    // 5. Aplicar chunking según formato
    const chunks = applyChunking(extractedText, format, sourceId);

    if (chunks.length === 0) {
      await sourceRepo.updateStatus(sourceId, 'failed', {
        errorReason: 'No se pudo extraer texto del documento',
      });
      return;
    }

    // 6. Actualizar progreso: "embedding"
    await sourceRepo.updateProgress(sourceId, 'embedding');

    // 7. Generar embeddings en batches con manejo de errores parciales
    const { embeddings, failedIndices } = await generateEmbeddingsWithPartialErrors(
      chunks.map((c) => c.content),
      sourceId,
      sourceRepo,
      chunks.length,
    );

    // 8. Actualizar progreso: "storing"
    await sourceRepo.updateProgress(sourceId, 'storing');

    // 9. Construir y almacenar fragmentos exitosos en MongoDB
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

    // 10. Actualizar KnowledgeSource según resultado
    if (failedIndices.size > 0) {
      // Estado parcial: algunos fragmentos fallaron
      await sourceRepo.updateStatus(sourceId, 'partial', {
        fragmentCount: successfulFragments.length,
        processedAt: now,
        errorReason: `${failedIndices.size} de ${chunks.length} fragmentos fallaron en la generación de embeddings`,
      });
    } else {
      // Éxito completo
      await sourceRepo.updateStatus(sourceId, 'indexed', {
        fragmentCount: successfulFragments.length,
        processedAt: now,
      });
    }
  } catch (error) {
    // Manejo de errores específicos
    if (error instanceof TextExtractionError) {
      // Archivo corrupto o error de extracción → marcar como failed
      await sourceRepo.updateStatus(sourceId, 'failed', {
        errorReason: error.message,
      });
      return;
    }

    // Cualquier otro error → propagar para que SQS reintente
    throw error;
  }
}

// ─── Funciones auxiliares ────────────────────────────────────────────────────

/**
 * Descarga un archivo desde S3 y retorna su contenido como Buffer.
 */
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

  // Convertir el stream a Buffer
  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

/**
 * Aplica chunking según el formato del documento.
 * - MD: usa chunkMarkdown (headers como separadores naturales)
 * - TXT/PDF: usa chunkPlainText (párrafos como separadores)
 */
function applyChunking(text: string, format: SupportedFormat, sourceId: string) {
  if (format === 'md') {
    return chunkingService.chunkMarkdown(text, sourceId);
  }
  // Para txt y pdf, usar chunking por texto plano
  return chunkingService.chunkPlainText(text, sourceId);
}

/**
 * Genera embeddings para todos los chunks, manejando errores individuales.
 * Si un fragmento falla, se registra su índice y se continúa con los demás.
 * Actualiza el progreso con "embedding N/total" durante el procesamiento.
 *
 * Valida: Requisitos 5.1, 5.2, 5.3
 */
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

    // Actualizar progreso con el batch actual
    await sourceRepo.updateProgress(sourceId, 'embedding');

    // Procesar cada texto del batch individualmente para capturar errores parciales
    for (let j = i; j < batchEnd; j++) {
      try {
        const embedding = await embeddingService.generateEmbedding(texts[j]);
        embeddings[j] = embedding;
      } catch (_error) {
        // Error en fragmento individual → registrar y continuar
        failedIndices.add(j);
      }
    }
  }

  // Si TODOS los fragmentos fallaron, es un error del servicio → propagar
  if (failedIndices.size === texts.length && texts.length > 0) {
    throw new Error(
      `El servicio de embeddings no está disponible: todos los ${totalChunks} fragmentos fallaron`,
    );
  }

  return { embeddings, failedIndices };
}
