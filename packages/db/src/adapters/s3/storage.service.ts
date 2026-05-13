/**
 * Implementación S3 del servicio de almacenamiento.
 * Usa @aws-sdk/client-s3 y @aws-sdk/s3-request-presigner para operaciones con S3.
 *
 * Implementa la interfaz IStorageService definida en @multibotagents/core
 * de forma estructural (sin import directo para evitar dependencia circular).
 * La conformidad se verifica en el punto de inyección (NestJS module).
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Configuración requerida para el servicio de storage S3. */
export interface S3StorageConfig {
  /** Nombre del bucket S3. */
  bucket: string;
  /** Región AWS del bucket. */
  region: string;
}

/**
 * Servicio de almacenamiento basado en AWS S3.
 * Implementa IStorageService (de @multibotagents/core) estructuralmente.
 * Métodos: generatePresignedUploadUrl, deleteObject, getPublicUrl.
 */
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.region = config.region;
    this.client = new S3Client({ region: config.region });
  }

  /**
   * Genera una presigned URL para subir un archivo a S3.
   * Solo firma el Content-Type para que el frontend pueda subir con cualquier tamaño (hasta 5MB por política del bucket).
   * No se incluye ContentLength en la firma para permitir archivos de cualquier tamaño.
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
      signableHeaders: new Set(['host', 'content-type']),
      unhoistableHeaders: new Set(['content-type']),
    });

    return url;
  }

  /**
   * Elimina un objeto de S3.
   */
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Obtiene la URL pública de un objeto en S3.
   * Formato: https://{bucket}.s3.{region}.amazonaws.com/{key}
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
