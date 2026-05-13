/**
 * Interfaz del servicio de almacenamiento de archivos.
 * Define el contrato para operaciones de storage (S3, GCS, etc.)
 * sin acoplar la lógica de negocio a una implementación concreta.
 */

export interface IStorageService {
  /**
   * Genera una presigned URL para subir un archivo a storage.
   * @param key - Key del objeto (e.g., logos/{companyId}/{timestamp}-{fileName})
   * @param contentType - MIME type del archivo (image/png o image/jpeg)
   * @param expiresInSeconds - Tiempo de expiración de la URL (default: 300)
   * @returns Presigned URL para PUT
   */
  generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<string>;

  /**
   * Elimina un objeto del storage.
   * @param key - Key del objeto a eliminar
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Obtiene la URL pública de un objeto en storage.
   * @param key - Key del objeto
   * @returns URL pública del objeto
   */
  getPublicUrl(key: string): string;
}
