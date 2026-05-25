/**
 * Tokens de inyección para el módulo Knowledge.
 * Permiten inyectar interfaces abstractas sin depender de implementaciones concretas.
 *
 * Uso: @Inject(KNOWLEDGE_SOURCE_REPOSITORY) private readonly sourceRepo: KnowledgeSourceRepository
 */

/** Token para inyectar el repositorio de fuentes de conocimiento */
export const KNOWLEDGE_SOURCE_REPOSITORY = Symbol('KNOWLEDGE_SOURCE_REPOSITORY');

/** Token para inyectar el repositorio de fragmentos de conocimiento */
export const KNOWLEDGE_FRAGMENT_REPOSITORY = Symbol('KNOWLEDGE_FRAGMENT_REPOSITORY');

/** Token para inyectar el cliente S3 (subida/descarga de archivos) */
export const S3_CLIENT = Symbol('S3_CLIENT');

/** Token para inyectar el cliente SQS (envío de mensajes para re-procesamiento) */
export const SQS_CLIENT = Symbol('SQS_CLIENT');
