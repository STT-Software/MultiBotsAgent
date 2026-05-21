import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

/**
 * Interfaz para el servicio de generación de embeddings vectoriales.
 */
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * Implementación del servicio de embeddings usando Amazon Titan Embeddings v2 vía Bedrock.
 * Genera vectores de 1024 dimensiones normalizados para búsqueda por similitud coseno.
 */
export class BedrockEmbeddingService implements EmbeddingService {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId = 'amazon.titan-embed-text-v2:0';
  private readonly batchSize = 5;

  constructor(region: string) {
    this.client = new BedrockRuntimeClient({ region });
  }

  /**
   * Genera un embedding vectorial de 1024 dimensiones para un texto dado.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const requestBody = JSON.stringify({
      inputText: text,
      dimensions: 1024,
      normalize: true,
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: requestBody,
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return responseBody.embedding as number[];
  }

  /**
   * Genera embeddings para múltiples textos, procesando en batches de 5
   * para respetar los rate limits de Amazon Bedrock.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchResults = await Promise.all(
        batch.map((text) => this.generateEmbedding(text)),
      );
      results.push(...batchResults);
    }

    return results;
  }
}
