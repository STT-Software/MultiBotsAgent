/**
 * Interface del mensaje de indexación enviado a la Cola SQS.
 * Contiene la información necesaria para que la Lambda de indexación
 * procese un archivo subido a S3.
 *
 * Valida: Requisito 12.1
 */

import type { SupportedFormat } from './knowledge-source.interface';

/**
 * Mensaje que dispara el procesamiento asíncrono de un documento.
 * Se envía a la Cola_Indexacion cuando un archivo se almacena en S3.
 */
export interface IndexationMessage {
  sourceId: string;
  agentId: string;
  companyId: string;
  s3Key: string;
  format: SupportedFormat;
  title: string;
}
