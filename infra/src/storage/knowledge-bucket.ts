/**
 * Bucket S3 para documentos de conocimiento.
 *
 * Almacena los archivos originales (PDF, TXT, MD) subidos por administradores
 * para la base de conocimiento de los agentes. Los archivos se preservan
 * para permitir re-indexación con configuraciones futuras.
 *
 * Key pattern: {companyId}/{agentId}/{sourceId}/{filename}
 * Acceso: privado (solo accesible vía IAM roles del pipeline de indexación).
 */

export const knowledgeBucket = new sst.aws.Bucket("KnowledgeBucket", {
  access: "private",
});
